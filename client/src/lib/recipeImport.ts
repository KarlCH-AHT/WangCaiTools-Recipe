import { Recipe } from "@/types/recipe";
import { nanoid } from "nanoid";

export const importRecipesFromJSON = (jsonString: string): Recipe[] => {
  try {
    const data = JSON.parse(jsonString);
    const recipes = Array.isArray(data) ? data : [data];
    const now = new Date().toISOString();

    return recipes.map((recipe: any) => ({
      id: recipe.id || nanoid(),
      title: recipe.title || "Untitled Recipe",
      description: recipe.description || "",
      servings: recipe.servings || 1,
      prepTime: recipe.prepTime || 0,
      cookTime: recipe.cookTime || 0,
      category: recipe.category || "lunch",
      tags: recipe.tags || [],
      imageUrl: recipe.imageUrl || "",
      ingredients: (recipe.ingredients || []).map((ing: any, idx: number) => ({
        id: ing.id || nanoid(),
        name: ing.name || "",
        amount: ing.amount || 0,
        unit: ing.unit || "",
      })),
      steps: (recipe.steps || []).map((step: any, idx: number) => ({
        id: step.id || nanoid(),
        number: step.number || idx,
        description: step.description || step || "",
        duration: step.duration,
      })),
      createdAt: recipe.createdAt || now,
      updatedAt: recipe.updatedAt || now,
    }));
  } catch (error) {
    console.error("JSON import error:", error);
    throw new Error("Invalid JSON format");
  }
};

export const importRecipesFromCSV = (csvString: string): Recipe[] => {
  try {
    const lines = csvString.trim().split("\n");
    if (lines.length < 2) {
      throw new Error("CSV must have header row and at least one data row");
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const recipes: Recipe[] = [];

    // Parse CSV rows
    let currentRecipe: any = null;
    let currentIngredients: any[] = [];
    let currentSteps: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Simple CSV parsing (doesn't handle quoted commas perfectly)
      const values = line.split(",").map((v) => v.trim());

      // Check if this is a new recipe (has title in first column)
      if (values[0] && values[0] !== currentRecipe?.title) {
        // Save previous recipe if exists
        if (currentRecipe) {
          currentRecipe.ingredients = currentIngredients;
          currentRecipe.steps = currentSteps;
          recipes.push(currentRecipe);
        }

        // Start new recipe
        const now = new Date().toISOString();
        currentRecipe = {
          id: nanoid(),
          title: values[0] || "Untitled",
          description: values[1] || "",
          servings: parseInt(values[2]) || 1,
          prepTime: parseInt(values[3]) || 0,
          cookTime: parseInt(values[4]) || 0,
          category: values[5] || "lunch",
          tags: values[6] ? values[6].split(";").map((t) => t.trim()) : [],
          imageUrl: values[7] || "",
          createdAt: now,
          updatedAt: now,
        };
        currentIngredients = [];
        currentSteps = [];
      }

      // Parse ingredients and steps if they exist in the row
      if (values.length > 8 && values[8]) {
        // Ingredient format: amount,unit,name
        currentIngredients.push({
          amount: parseFloat(values[8]) || 0,
          unit: values[9] || "",
          name: values[10] || "",
        });
      }

      if (values.length > 11 && values[11]) {
        // Step format: description
        currentSteps.push({
          description: values[11],
        });
      }
    }

    // Save last recipe
    if (currentRecipe) {
      currentRecipe.ingredients = currentIngredients;
      currentRecipe.steps = currentSteps;
      recipes.push(currentRecipe);
    }

    return recipes;
  } catch (error) {
    console.error("CSV import error:", error);
    throw new Error("Invalid CSV format");
  }
};

export const exportRecipesToCSV = (recipes: Recipe[]): string => {
  // CSV Header
  const headers = [
    "Title",
    "Description",
    "Servings",
    "Prep Time",
    "Cook Time",
    "Category",
    "Tags",
    "Image URL",
    "Ingredient Amount",
    "Ingredient Unit",
    "Ingredient Name",
    "Step Description",
  ];

  const rows: string[] = [headers.join(",")];

  recipes.forEach((recipe) => {
    const maxRows = Math.max(recipe.ingredients.length, recipe.steps.length, 1);

    for (let i = 0; i < maxRows; i++) {
      const row: string[] = [];

      // Recipe info (only on first row)
      if (i === 0) {
        row.push(`"${recipe.title}"`);
        row.push(`"${recipe.description || ""}"`);
        row.push(String(recipe.servings));
        row.push(String(recipe.prepTime || 0));
        row.push(String(recipe.cookTime || 0));
        row.push(recipe.category || "");
        row.push((recipe.tags || []).join(";"));
        row.push(recipe.imageUrl || "");
      } else {
        // Empty cells for recipe info on subsequent rows
        for (let j = 0; j < 8; j++) {
          row.push("");
        }
      }

      // Ingredient info
      if (i < recipe.ingredients.length) {
        const ing = recipe.ingredients[i];
        row.push(String(ing.amount || ""));
        row.push(ing.unit || "");
        row.push(`"${ing.name}"`);
      } else {
        row.push("");
        row.push("");
        row.push("");
      }

      // Step info
      if (i < recipe.steps.length) {
        row.push(`"${recipe.steps[i].description}"`);
      } else {
        row.push("");
      }

      rows.push(row.join(","));
    }
  });

  return rows.join("\n");
};
