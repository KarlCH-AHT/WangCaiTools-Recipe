import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Unique user identifier (nanoid for email/password auth). */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  avatarUrl: text("avatarUrl"),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// TODO: Add your tables here
// Recipe tables
export const recipes = mysqlTable("recipes", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 64 }),
  servings: int("servings").default(1).notNull(),
  prepTime: int("prepTime"), // in minutes
  cookTime: int("cookTime"), // in minutes
  imageUrl: text("imageUrl"),
  isFavorite: int("isFavorite").default(0).notNull(), // 0 or 1 for boolean
  notes: text("notes"), // personal notes / experience
  sourceUrl: text("sourceUrl"), // original recipe source URL
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Recipe = typeof recipes.$inferSelect;
export type InsertRecipe = typeof recipes.$inferInsert;

// Recipe ingredients
export const ingredients = mysqlTable("ingredients", {
  id: varchar("id", { length: 36 }).primaryKey(),
  recipeId: varchar("recipeId", { length: 36 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  amount: int("amount").notNull(), // stored as integer (multiply by 100 for decimals)
  unit: varchar("unit", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Ingredient = typeof ingredients.$inferSelect;
export type InsertIngredient = typeof ingredients.$inferInsert;

// Recipe steps
export const steps = mysqlTable("steps", {
  id: varchar("id", { length: 36 }).primaryKey(),
  recipeId: varchar("recipeId", { length: 36 }).notNull(),
  number: int("number").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Step = typeof steps.$inferSelect;
export type InsertStep = typeof steps.$inferInsert;

// Recipe tags
export const tags = mysqlTable("tags", {
  id: varchar("id", { length: 36 }).primaryKey(),
  recipeId: varchar("recipeId", { length: 36 }).notNull(),
  tag: varchar("tag", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Tag = typeof tags.$inferSelect;
export type InsertTag = typeof tags.$inferInsert;

// Recipe images (multi-image support)
export const recipeImages = mysqlTable("recipeImages", {
  id: varchar("id", { length: 36 }).primaryKey(),
  recipeId: varchar("recipeId", { length: 36 }).notNull(),
  url: text("url").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RecipeImage = typeof recipeImages.$inferSelect;
export type InsertRecipeImage = typeof recipeImages.$inferInsert;

// Daily menu items
export const dailyMenuItems = mysqlTable("dailyMenuItems", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: int("userId").notNull(),
  recipeId: varchar("recipeId", { length: 36 }).notNull(),
  servings: int("servings").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DailyMenuItem = typeof dailyMenuItems.$inferSelect;
export type InsertDailyMenuItem = typeof dailyMenuItems.$inferInsert;
