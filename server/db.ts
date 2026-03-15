import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, recipes, ingredients, steps, tags, dailyMenuItems, recipeImages, InsertRecipe, Recipe, InsertIngredient, Ingredient, InsertStep, Step, InsertTag, Tag, InsertDailyMenuItem, DailyMenuItem, RecipeImage, InsertRecipeImage } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "avatarUrl"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.passwordHash !== undefined) {
      values.passwordHash = user.passwordHash;
      updateSet.passwordHash = user.passwordHash;
    }

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.

// Recipe queries

export async function createRecipe(userId: number, data: Omit<InsertRecipe, 'userId'>): Promise<Recipe> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(recipes).values({
    ...data,
    userId,
  });
  
  // Fetch and return the created recipe
  const created = await db.select().from(recipes).where(eq(recipes.id, data.id)).limit(1);
  return created[0];
}

export async function getRecipesByUserId(_userId: number): Promise<Recipe[]> {
  const db = await getDb();
  if (!db) return [];
  
  // Family sharing mode: return all recipes regardless of userId
  return db.select().from(recipes);
}

export async function getRecipeById(recipeId: string, _userId: number): Promise<Recipe | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  // Family sharing mode: any user can access any recipe
  const result = await db.select().from(recipes).where(
    eq(recipes.id, recipeId)
  ).limit(1);
  
  return result[0];
}

export async function updateRecipe(recipeId: string, _userId: number, data: Partial<Omit<Recipe, 'id' | 'userId' | 'createdAt'>>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Family sharing mode: any user can update any recipe
  await db.update(recipes)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(recipes.id, recipeId));
}

export async function deleteRecipe(recipeId: string, _userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Delete related data first
  await db.delete(ingredients).where(eq(ingredients.recipeId, recipeId));
  await db.delete(steps).where(eq(steps.recipeId, recipeId));
  await db.delete(tags).where(eq(tags.recipeId, recipeId));
  await db.delete(dailyMenuItems).where(eq(dailyMenuItems.recipeId, recipeId));
  
  // Family sharing mode: any user can delete any recipe
  await db.delete(recipes).where(eq(recipes.id, recipeId));
}

// Ingredient queries
export async function createIngredient(data: InsertIngredient): Promise<Ingredient> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(ingredients).values(data);
  const created = await db.select().from(ingredients).where(eq(ingredients.id, data.id)).limit(1);
  return created[0];
}

export async function getIngredientsByRecipeId(recipeId: string): Promise<Ingredient[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(ingredients).where(eq(ingredients.recipeId, recipeId));
}

export async function deleteIngredientsByRecipeId(recipeId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(ingredients).where(eq(ingredients.recipeId, recipeId));
}

// Step queries
export async function createStep(data: InsertStep): Promise<Step> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(steps).values(data);
  const created = await db.select().from(steps).where(eq(steps.id, data.id)).limit(1);
  return created[0];
}

export async function getStepsByRecipeId(recipeId: string): Promise<Step[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(steps).where(eq(steps.recipeId, recipeId));
}

export async function deleteStepsByRecipeId(recipeId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(steps).where(eq(steps.recipeId, recipeId));
}

// Tag queries
export async function createTag(data: InsertTag): Promise<Tag> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(tags).values(data);
  const created = await db.select().from(tags).where(eq(tags.id, data.id)).limit(1);
  return created[0];
}

export async function getTagsByRecipeId(recipeId: string): Promise<Tag[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(tags).where(eq(tags.recipeId, recipeId));
}

export async function deleteTagsByRecipeId(recipeId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(tags).where(eq(tags.recipeId, recipeId));
}

// Recipe Images queries
export async function createRecipeImage(data: InsertRecipeImage): Promise<RecipeImage> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(recipeImages).values(data);
  const created = await db.select().from(recipeImages).where(eq(recipeImages.id, data.id)).limit(1);
  return created[0];
}

export async function getImagesByRecipeId(recipeId: string): Promise<RecipeImage[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(recipeImages)
    .where(eq(recipeImages.recipeId, recipeId))
    .orderBy(recipeImages.sortOrder);
}

export async function deleteImagesByRecipeId(recipeId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(recipeImages).where(eq(recipeImages.recipeId, recipeId));
}

// Daily Menu queries
export async function addToDailyMenu(userId: number, data: Omit<InsertDailyMenuItem, 'userId'>): Promise<DailyMenuItem> {
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
    and(eq(dailyMenuItems.id, dailyMenuItemId), eq(dailyMenuItems.userId, userId))
  );
}

export async function clearDailyMenu(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(dailyMenuItems).where(eq(dailyMenuItems.userId, userId));
}
