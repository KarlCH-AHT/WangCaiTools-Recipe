import { describe, it, expect, beforeEach, vi } from "vitest";
import { recipesRouter } from "./recipes";
import * as db from "../db";

// Mock database functions
vi.mock("../db", () => ({
  getRecipesByUserId: vi.fn(),
  getRecipeById: vi.fn(),
  createRecipe: vi.fn(),
  updateRecipe: vi.fn(),
  deleteRecipe: vi.fn(),
  getIngredientsByRecipeId: vi.fn(),
  getStepsByRecipeId: vi.fn(),
  getTagsByRecipeId: vi.fn(),
  getImagesByRecipeId: vi.fn(),
  deleteIngredientsByRecipeId: vi.fn(),
  deleteStepsByRecipeId: vi.fn(),
  deleteTagsByRecipeId: vi.fn(),
  deleteImagesByRecipeId: vi.fn(),
  createImage: vi.fn(),
  createIngredient: vi.fn(),
  createStep: vi.fn(),
  createTag: vi.fn(),
  getDailyMenuByUserId: vi.fn(),
  addToDailyMenu: vi.fn(),
  removeFromDailyMenu: vi.fn(),
  clearDailyMenu: vi.fn(),
}));

describe("recipes router", () => {
  const mockUser = { id: 1, openId: "test-user", role: "user" as const, name: "Test User", email: "test@example.com", loginMethod: "email", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
  
  const mockRecipe = {
    id: "recipe-1",
    userId: 1,
    title: "Test Recipe",
    description: "A test recipe",
    category: "lunch",
    servings: 4,
    prepTime: 15,
    cookTime: 30,
    imageUrl: "https://example.com/image.jpg",
    isFavorite: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockIngredient = {
    id: "ingredient-1",
    recipeId: "recipe-1",
    name: "Flour",
    amount: 200,
    unit: "g",
    createdAt: new Date(),
  };

  const mockStep = {
    id: "step-1",
    recipeId: "recipe-1",
    number: 1,
    description: "Mix ingredients",
    createdAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("should return all recipes for the user", async () => {
      vi.mocked(db.getRecipesByUserId).mockResolvedValue([mockRecipe]);
      vi.mocked(db.getIngredientsByRecipeId).mockResolvedValue([mockIngredient]);
      vi.mocked(db.getStepsByRecipeId).mockResolvedValue([mockStep]);
      vi.mocked(db.getTagsByRecipeId).mockResolvedValue([]);
      vi.mocked(db.getImagesByRecipeId).mockResolvedValue([]);

      const caller = recipesRouter.createCaller({ user: mockUser, req: {} as any, res: {} as any });
      const result = await caller.list();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "recipe-1",
        title: "Test Recipe",
      });
      expect(vi.mocked(db.getRecipesByUserId)).toHaveBeenCalledWith(1);
    });

    it("should return empty array if no recipes", async () => {
      vi.mocked(db.getRecipesByUserId).mockResolvedValue([]);

      const caller = recipesRouter.createCaller({ user: mockUser, req: {} as any, res: {} as any });
      const result = await caller.list();

      expect(result).toEqual([]);
    });
  });

  describe("create", () => {
    it("should create a new recipe with ingredients and steps", async () => {
      vi.mocked(db.createRecipe).mockResolvedValue(mockRecipe);
      vi.mocked(db.createIngredient).mockResolvedValue(mockIngredient);
      vi.mocked(db.createStep).mockResolvedValue(mockStep);
      vi.mocked(db.createTag).mockResolvedValue({ id: "tag-1", recipeId: "recipe-1", tag: "quick", createdAt: new Date() });

      const caller = recipesRouter.createCaller({ user: mockUser, req: {} as any, res: {} as any });
      const result = await caller.create({
        title: "Test Recipe",
        description: "A test recipe",
        category: "lunch",
        servings: 4,
        prepTime: 15,
        cookTime: 30,
        imageUrl: "https://example.com/image.jpg",
        ingredients: [
          { name: "Flour", amount: 200, unit: "g" },
        ],
        steps: [
          { number: 1, description: "Mix ingredients" },
        ],
        tags: ["quick"],
      });

      expect(result).toBeDefined();
      expect(result.title).toBe("Test Recipe");
      expect(vi.mocked(db.createRecipe)).toHaveBeenCalled();
      expect(vi.mocked(db.createIngredient)).toHaveBeenCalled();
      expect(vi.mocked(db.createStep)).toHaveBeenCalled();
    });
  });

  describe("toggleFavorite", () => {
    it("should toggle favorite status", async () => {
      vi.mocked(db.getRecipeById).mockResolvedValue(mockRecipe);
      vi.mocked(db.updateRecipe).mockResolvedValue(undefined);

      const caller = recipesRouter.createCaller({ user: mockUser, req: {} as any, res: {} as any });
      const result = await caller.toggleFavorite({ id: "recipe-1" });

      expect(result).toEqual({ success: true });
      expect(vi.mocked(db.updateRecipe)).toHaveBeenCalledWith("recipe-1", 1, { isFavorite: 1 });
    });

    it("should throw error if recipe not found", async () => {
      vi.mocked(db.getRecipeById).mockResolvedValue(undefined);

      const caller = recipesRouter.createCaller({ user: mockUser, req: {} as any, res: {} as any });

      await expect(caller.toggleFavorite({ id: "nonexistent" })).rejects.toThrow();
    });
  });

  describe("delete", () => {
    it("should delete a recipe", async () => {
      vi.mocked(db.deleteRecipe).mockResolvedValue(undefined);
      vi.mocked(db.deleteImagesByRecipeId).mockResolvedValue(undefined);

      const caller = recipesRouter.createCaller({ user: mockUser, req: {} as any, res: {} as any });
      const result = await caller.delete({ id: "recipe-1" });

      expect(result).toEqual({ success: true });
      expect(vi.mocked(db.deleteRecipe)).toHaveBeenCalledWith("recipe-1", 1);
    });
  });

  describe("getDailyMenu", () => {
    it("should return daily menu items with recipes", async () => {
      const mockMenuItem = {
        id: "menu-item-1",
        userId: 1,
        recipeId: "recipe-1",
        servings: 2,
        createdAt: new Date(),
      };

      vi.mocked(db.getDailyMenuByUserId).mockResolvedValue([mockMenuItem]);
      vi.mocked(db.getRecipeById).mockResolvedValue(mockRecipe);

      const caller = recipesRouter.createCaller({ user: mockUser, req: {} as any, res: {} as any });
      const result = await caller.getDailyMenu();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "menu-item-1",
        recipeId: "recipe-1",
      });
    });
  });

  describe("addToDailyMenu", () => {
    it("should add recipe to daily menu", async () => {
      const mockMenuItem = {
        id: "menu-item-1",
        userId: 1,
        recipeId: "recipe-1",
        servings: 2,
        createdAt: new Date(),
      };

      vi.mocked(db.getRecipeById).mockResolvedValue(mockRecipe);
      vi.mocked(db.addToDailyMenu).mockResolvedValue(mockMenuItem);

      const caller = recipesRouter.createCaller({ user: mockUser, req: {} as any, res: {} as any });
      const result = await caller.addToDailyMenu({ recipeId: "recipe-1", servings: 2 });

      expect(result).toMatchObject({
        recipeId: "recipe-1",
        servings: 2,
      });
      expect(vi.mocked(db.addToDailyMenu)).toHaveBeenCalled();
    });

    it("should throw error if recipe not found", async () => {
      vi.mocked(db.getRecipeById).mockResolvedValue(undefined);

      const caller = recipesRouter.createCaller({ user: mockUser, req: {} as any, res: {} as any });

      await expect(caller.addToDailyMenu({ recipeId: "nonexistent", servings: 1 })).rejects.toThrow();
    });
  });

  describe("clearDailyMenu", () => {
    it("should clear all daily menu items", async () => {
      vi.mocked(db.clearDailyMenu).mockResolvedValue(undefined);

      const caller = recipesRouter.createCaller({ user: mockUser, req: {} as any, res: {} as any });
      const result = await caller.clearDailyMenu();

      expect(result).toEqual({ success: true });
      expect(vi.mocked(db.clearDailyMenu)).toHaveBeenCalledWith(1);
    });
  });
});
