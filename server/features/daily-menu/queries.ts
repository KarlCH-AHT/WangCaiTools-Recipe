import { and, eq } from "drizzle-orm";
import { dailyMenuItems, type DailyMenuItem, type InsertDailyMenuItem } from "../../../drizzle/schema";
import { getDb } from "../../db";

export async function addToDailyMenu(userId: number, data: Omit<InsertDailyMenuItem, "userId">): Promise<DailyMenuItem> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(dailyMenuItems).values({ ...data, userId });
  const created = await db.select().from(dailyMenuItems).where(eq(dailyMenuItems.id, data.id)).limit(1);
  return created[0];
}

export async function getDailyMenuByUserId(userId: number): Promise<DailyMenuItem[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(dailyMenuItems).where(eq(dailyMenuItems.userId, userId));
}

export async function removeFromDailyMenu(dailyMenuItemId: string, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(dailyMenuItems).where(
    and(eq(dailyMenuItems.id, dailyMenuItemId), eq(dailyMenuItems.userId, userId)),
  );
}

export async function clearDailyMenu(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(dailyMenuItems).where(eq(dailyMenuItems.userId, userId));
}

export async function updateDailyMenuItemServings(dailyMenuItemId: string, userId: number, servings: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(dailyMenuItems)
    .set({ servings })
    .where(and(eq(dailyMenuItems.id, dailyMenuItemId), eq(dailyMenuItems.userId, userId)));
}

export async function getDailyMenuItemByRecipeId(userId: number, recipeId: string): Promise<DailyMenuItem | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(dailyMenuItems)
    .where(and(eq(dailyMenuItems.userId, userId), eq(dailyMenuItems.recipeId, recipeId)))
    .limit(1);

  return result[0];
}
