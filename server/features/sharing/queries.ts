import { eq } from "drizzle-orm";
import { menuShares, type InsertMenuShare, type MenuShare } from "../../../drizzle/schema";
import { getDb } from "../../db";

export async function createMenuShare(userId: number, data: Omit<InsertMenuShare, "userId">): Promise<MenuShare> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(menuShares).values({ ...data, userId });
  const created = await db.select().from(menuShares).where(eq(menuShares.id, data.id)).limit(1);
  return created[0];
}

export async function getMenuShareById(shareId: string): Promise<MenuShare | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(menuShares).where(eq(menuShares.id, shareId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateMenuShareMetadata(shareId: string, metadataJson: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(menuShares).set({ metadataJson }).where(eq(menuShares.id, shareId));
}
