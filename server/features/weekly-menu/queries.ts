import { and, desc, eq } from "drizzle-orm";
import { weeklyMenus, type InsertWeeklyMenu, type WeeklyMenu } from "../../../drizzle/schema";
import { getDb } from "../../db";

export async function createWeeklyMenu(userId: number, data: Omit<InsertWeeklyMenu, "userId">): Promise<WeeklyMenu> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(weeklyMenus).values({ ...data, userId });
  const created = await db.select().from(weeklyMenus).where(eq(weeklyMenus.id, data.id)).limit(1);
  return created[0];
}

export async function getWeeklyMenusByUserId(userId: number): Promise<WeeklyMenu[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(weeklyMenus).where(eq(weeklyMenus.userId, userId)).orderBy(desc(weeklyMenus.updatedAt));
}

export async function getWeeklyMenuById(id: string, userId: number): Promise<WeeklyMenu | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(weeklyMenus)
    .where(and(eq(weeklyMenus.id, id), eq(weeklyMenus.userId, userId)))
    .limit(1);

  return result[0];
}

export async function updateWeeklyMenuById(id: string, userId: number, data: Partial<Omit<WeeklyMenu, "id" | "userId" | "createdAt">>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(weeklyMenus)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(weeklyMenus.id, id), eq(weeklyMenus.userId, userId)));
}

export async function deleteWeeklyMenuById(id: string, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(weeklyMenus).where(and(eq(weeklyMenus.id, id), eq(weeklyMenus.userId, userId)));
}
