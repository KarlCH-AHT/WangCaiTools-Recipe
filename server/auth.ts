/**
 * Standard email/password authentication.
 * Replaces Manus OAuth with a self-contained JWT-based auth system.
 *
 * Routes:
 *   POST /api/auth/register  – create account
 *   POST /api/auth/login     – sign in, sets session cookie
 *   POST /api/auth/logout    – clear session cookie
 */
import bcrypt from "bcryptjs";
import type { Express, Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import { nanoid } from "nanoid";
import { parse as parseCookies } from "cookie";
import { z } from "zod";
import * as db from "./db";
import { ENV } from "./_core/env";
import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const";
import type { User } from "../drizzle/schema";

// ── JWT helpers ──────────────────────────────────────────────────────────────
type DevMockUser = User & { passwordHash: string };

const devUsersByEmail = new Map<string, DevMockUser>();
const devUsersByOpenId = new Map<string, DevMockUser>();
let devUserSeq = 1;

function isDevNoDbMode() {
  if (process.env.AUTH_DEV_NO_DB === "1") return true;
  return !ENV.isProduction && !process.env.DATABASE_URL;
}

function makeDevUser(params: {
  openId: string;
  email: string;
  name: string;
  passwordHash: string;
}): DevMockUser {
  const now = new Date();
  return {
    id: devUserSeq++,
    openId: params.openId,
    name: params.name,
    email: params.email,
    passwordHash: params.passwordHash,
    loginMethod: "email",
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  };
}

function getSecret(): Uint8Array {
  return new TextEncoder().encode(ENV.cookieSecret);
}

export async function signSession(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(Math.floor((Date.now() + ONE_YEAR_MS) / 1000))
    .sign(getSecret());
}

export async function verifySession(token: string | undefined | null): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function authenticateRequest(req: Request): Promise<User | null> {
  const cookies = parseCookies(req.headers.cookie ?? "");
  const token = cookies[COOKIE_NAME];
  const openId = await verifySession(token);
  if (!openId) return null;
  if (isDevNoDbMode()) {
    return devUsersByOpenId.get(openId) ?? null;
  }
  return (await db.getUserByOpenId(openId)) ?? null;
}

// ── Cookie options ────────────────────────────────────────────────────────────

function cookieOptions(req: Request) {
  const isSecure =
    req.headers["x-forwarded-proto"] === "https" ||
    req.secure;
  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax" as const,
    path: "/",
  };
}

// ── Route registration ────────────────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export function registerAuthRoutes(app: Express) {
  // Register
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
      return;
    }
    const { email, password, name } = parsed.data;

    try {
      if (isDevNoDbMode()) {
        const existing = devUsersByEmail.get(email);
        if (existing) {
          res.status(409).json({ error: "Email already registered" });
          return;
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const openId = nanoid();
        const user = makeDevUser({
          openId,
          email,
          name: name ?? email.split("@")[0],
          passwordHash,
        });
        devUsersByEmail.set(email, user);
        devUsersByOpenId.set(openId, user);

        const token = await signSession(openId);
        res.cookie(COOKIE_NAME, token, { ...cookieOptions(req), maxAge: ONE_YEAR_MS });
        res.json({ user, devNoDbMode: true });
        return;
      }

      const dbConn = await db.getDb();
      if (!dbConn) {
        res.status(503).json({ error: "Database not available" });
        return;
      }

      const existing = await db.getUserByEmail(email);
      if (existing) {
        res.status(409).json({ error: "Email already registered" });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const openId = nanoid();

      await db.upsertUser({
        openId,
        email,
        name: name ?? email.split("@")[0],
        loginMethod: "email",
        passwordHash,
        lastSignedIn: new Date(),
      });

      const token = await signSession(openId);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions(req), maxAge: ONE_YEAR_MS });
      const user = await db.getUserByOpenId(openId);
      res.json({ user });
    } catch (err) {
      console.error("[Auth] Register error:", err);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // Login
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const { email, password } = parsed.data;

    try {
      if (isDevNoDbMode()) {
        const user = devUsersByEmail.get(email);
        if (!user || !user.passwordHash) {
          res.status(401).json({ error: "Invalid email or password" });
          return;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          res.status(401).json({ error: "Invalid email or password" });
          return;
        }

        user.lastSignedIn = new Date();
        const token = await signSession(user.openId);
        res.cookie(COOKIE_NAME, token, { ...cookieOptions(req), maxAge: ONE_YEAR_MS });
        res.json({
          user: { id: user.id, name: user.name, email: user.email, role: user.role },
          devNoDbMode: true,
        });
        return;
      }

      const dbConn = await db.getDb();
      if (!dbConn) {
        res.status(503).json({ error: "Database not available" });
        return;
      }

      const user = await db.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
      const token = await signSession(user.openId);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions(req), maxAge: ONE_YEAR_MS });
      res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (err) {
      console.error("[Auth] Login error:", err);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    res.clearCookie(COOKIE_NAME, { ...cookieOptions(req), maxAge: -1 });
    res.json({ success: true });
  });
}
