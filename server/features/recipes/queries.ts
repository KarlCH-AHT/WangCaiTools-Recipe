import { eq, inArray } from "drizzle-orm";
import {
  dailyMenuItems,
  ingredients,
  recipeImages,
  recipes,
  steps,
  tags,
  type Ingredient,
  type InsertIngredient,
  type InsertRecipe,
  type InsertRecipeImage,
  type InsertStep,
  type InsertTag,
  type Recipe,
  type RecipeImage,
  type Step,
  type Tag,
} from "../../../drizzle/schema";
import { getDb } from "../../db";

export async function createRecipe(userId: number, data: Omit<InsertRecipe, "userId">): Promise<Recipe> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(recipes).values({
    ...data,
    userId,
  });

  const created = await db.select().from(recipes).where(eq(recipes.id, data.id)).limit(1);
  return created[0];
}

export async function getRecipesByUserId(_userId: number): Promise<Recipe[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(recipes);
}

export async function getRecipeById(recipeId: string, _userId: number): Promise<Recipe | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(recipes).where(eq(recipes.id, recipeId)).limit(1);
  return result[0];
}

export async function getRecipesByIds(recipeIds: string[]): Promise<Recipe[]> {
  const db = await getDb();
  if (!db || recipeIds.length === 0) return [];
  return db.select().from(recipes).where(inArray(recipes.id, recipeIds));
}

export async function updateRecipe(recipeId: string, _userId: number, data: Partial<Omit<Recipe, "id" | "userId" | "createdAt">>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(recipes).set({ ...data, updatedAt: new Date() }).where(eq(recipes.id, recipeId));
}

export async function deleteRecipe(recipeId: string, _userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(ingredients).where(eq(ingredients.recipeId, recipeId));
  await db.delete(steps).where(eq(steps.recipeId, recipeId));
  await db.delete(tags).where(eq(tags.recipeId, recipeId));
  await db.delete(dailyMenuItems).where(eq(dailyMenuItems.recipeId, recipeId));
  await db.delete(recipes).where(eq(recipes.id, recipeId));
}

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

export async function getIngredientsByRecipeIds(recipeIds: string[]): Promise<Ingredient[]> {
  const db = await getDb();
  if (!db || recipeIds.length === 0) return [];
  return db.select().from(ingredients).where(inArray(ingredients.recipeId, recipeIds));
}

export async function deleteIngredientsByRecipeId(recipeId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(ingredients).where(eq(ingredients.recipeId, recipeId));
}

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

export async function getStepsByRecipeIds(recipeIds: string[]): Promise<Step[]> {
  const db = await getDb();
  if (!db || recipeIds.length === 0) return [];
  return db.select().from(steps).where(inArray(steps.recipeId, recipeIds));
}

export async function deleteStepsByRecipeId(recipeId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(steps).where(eq(steps.recipeId, recipeId));
}

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

export async function getTagsByRecipeIds(recipeIds: string[]): Promise<Tag[]> {
  const db = await getDb();
  if (!db || recipeIds.length === 0) return [];
  return db.select().from(tags).where(inArray(tags.recipeId, recipeIds));
}

export async function deleteTagsByRecipeId(recipeId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(tags).where(eq(tags.recipeId, recipeId));
}

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
  return db.select().from(recipeImages).where(eq(recipeImages.recipeId, recipeId)).orderBy(recipeImages.sortOrder);
}

export async function getImagesByRecipeIds(recipeIds: string[]): Promise<RecipeImage[]> {
  const db = await getDb();
  if (!db || recipeIds.length === 0) return [];
  return db.select().from(recipeImages).where(inArray(recipeImages.recipeId, recipeIds)).orderBy(recipeImages.sortOrder);
}

export async function deleteImagesByRecipeId(recipeId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(recipeImages).where(eq(recipeImages.recipeId, recipeId));
}
