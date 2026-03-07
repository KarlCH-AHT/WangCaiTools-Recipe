/**
 * Recipe Data Types
 * Core data structures for the family recipe planner
 */

export interface Ingredient {
  id: string;
  name: string;
  amount: number;
  unit: string; // "g", "ml", "tbsp", "tsp", "cup", "piece", etc.
}

export interface Step {
  id: string;
  number: number;
  description: string;
  duration?: number; // in minutes
  completed?: boolean;
}

export interface Recipe {
  id: string;
  title: string;
  description?: string;
  servings: number;
  prepTime?: number;
  cookTime?: number;
  difficulty?: "easy" | "medium" | "hard";
  category?: string;
  tags?: string[];
  ingredients: Ingredient[];
  steps: Step[];
  imageUrl?: string;
  images?: string[]; // multiple images (URLs or base64 data URIs)
  isFavorite?: boolean;
  rating?: number;
  notes?: string; // personal notes / experience
  sourceUrl?: string; // original recipe source URL
  createdAt: string;
  updatedAt: string;
}

export interface RecipeWithScaledIngredients extends Recipe {
  currentServings: number;
  scaledIngredients: Ingredient[];
}

export interface DailyMenuItem {
  recipeId: string;
  servings: number; // selected servings for this menu item
}

export interface DailyMenu {
  id: string;
  date: string;
  items: DailyMenuItem[];
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyMenu {
  id: string;
  startDate: string;
  items: { [day: string]: DailyMenuItem[] };
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingListItem {
  name: string;
  amount: number;
  unit: string;
  checked: boolean;
}
