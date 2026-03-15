import "dotenv/config";
import bcrypt from "bcryptjs";
import * as db from "../server/db";

async function main() {
  const [, , email, newPassword] = process.argv;
  if (!email || !newPassword) {
    console.error("Usage: pnpm tsx scripts/reset-password.ts <email> <newPassword>");
    process.exit(1);
  }

  const conn = await db.getDb();
  if (!conn) {
    console.error("Database not available. Check DATABASE_URL.");
    process.exit(1);
  }

  const user = await db.getUserByEmail(email);
  if (!user) {
    console.error("User not found.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.upsertUser({ openId: user.openId, passwordHash, lastSignedIn: new Date() });
  console.log("Password reset successful.");
}

main().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});
