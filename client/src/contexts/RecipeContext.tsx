import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Recipe } from "@/types/recipe";
import { trpc } from "@/lib/trpc";

interface RecipeContextType {
  recipes: Recipe[];
  dailyMenuItems: any[];
  loading: boolean;
  error: string | null;
  addRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateRecipe: (id: string, recipe: Partial<Recipe>) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  getRecipe: (id: string) => Recipe | undefined;
  toggleFavorite: (id: string) => Promise<void>;
  searchRecipes: (query: string) => Recipe[];
  getFavoriteRecipes: () => Recipe[];
  addToDailyMenu: (recipeId: string, servings: number) => Promise<void>;
  removeFromDailyMenu: (itemId: string) => Promise<void>;
  clearDailyMenu: () => Promise<void>;
}

const RecipeContext = createContext<RecipeContextType | undefined>(undefined);

export function RecipeProvider({ children }: { children: React.ReactNode }) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [dailyMenuItems, setDailyMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // tRPC queries and mutations
  const { data: recipesData, isLoading: isLoadingRecipes, refetch: refetchRecipes } = trpc.recipes.list.useQuery(undefined, {
    enabled: true,
  });

  const { data: dailyMenuData, refetch: refetchDailyMenu } = trpc.recipes.getDailyMenu.useQuery(undefined, {
    enabled: true,
  });

  const createRecipeMutation = trpc.recipes.create.useMutation();
  const updateRecipeMutation = trpc.recipes.update.useMutation();
  const deleteRecipeMutation = trpc.recipes.delete.useMutation();
  const toggleFavoriteMutation = trpc.recipes.toggleFavorite.useMutation();
  const addToDailyMenuMutation = trpc.recipes.addToDailyMenu.useMutation();
  const removeFromDailyMenuMutation = trpc.recipes.removeFromDailyMenu.useMutation();
  const clearDailyMenuMutation = trpc.recipes.clearDailyMenu.useMutation();

  // Map database response to Recipe type
  const mapDbRecipe = (r: any): Recipe => ({
    id: r.id,
    title: r.title,
    description: r.description ?? undefined,
    category: r.category ?? undefined,
    servings: r.servings,
    prepTime: r.prepTime ?? undefined,
    cookTime: r.cookTime ?? undefined,
    imageUrl: r.imageUrl ?? undefined,
    images: Array.isArray(r.images) ? r.images : undefined,
    isFavorite: r.isFavorite === 1 || r.isFavorite === true,
    rating: r.rating ?? undefined,
    notes: r.notes ?? undefined,
    sourceUrl: r.sourceUrl ?? undefined,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : (r.createdAt ?? new Date().toISOString()),
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : (r.updatedAt ?? new Date().toISOString()),
    ingredients: (r.ingredients ?? []).map((ing: any) => ({
      id: ing.id,
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit,
    })),
    steps: (r.steps ?? []).map((step: any) => ({
      id: step.id,
      number: step.number,
      description: step.description,
    })),
    tags: (r.tags ?? []).map((t: any) => typeof t === 'string' ? t : t.tag),
  });

  // Update local state when data from server changes
  useEffect(() => {
    if (recipesData) {
      setRecipes((recipesData as any[]).map(mapDbRecipe));
    }
  }, [recipesData]);

  useEffect(() => {
    if (dailyMenuData) {
      setDailyMenuItems(dailyMenuData as any);
    }
  }, [dailyMenuData]);

  const addRecipe = useCallback(
    async (recipeData: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        setLoading(true);
        setError(null);
        
        await createRecipeMutation.mutateAsync({
          title: recipeData.title,
          description: recipeData.description,
          category: recipeData.category,
          servings: recipeData.servings,
          prepTime: recipeData.prepTime,
          cookTime: recipeData.cookTime,
          imageUrl: recipeData.imageUrl,
          images: recipeData.images,
          ingredients: recipeData.ingredients || [],
          steps: recipeData.steps || [],
          tags: recipeData.tags || [],
          notes: recipeData.notes,
          sourceUrl: recipeData.sourceUrl,
        });

        await refetchRecipes();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to add recipe";
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [createRecipeMutation, refetchRecipes]
  );

  const updateRecipe = useCallback(
    async (id: string, updates: Partial<Recipe>) => {
      try {
        setLoading(true);
        setError(null);

        const data: Record<string, unknown> = {};
        if (updates.title !== undefined) data.title = updates.title;
        if (updates.description !== undefined) data.description = updates.description;
        if (updates.category !== undefined) data.category = updates.category;
        if (updates.servings !== undefined) data.servings = updates.servings;
        if (updates.prepTime !== undefined) data.prepTime = updates.prepTime;
        if (updates.cookTime !== undefined) data.cookTime = updates.cookTime;
        if (updates.imageUrl !== undefined) data.imageUrl = updates.imageUrl;
        if (updates.images !== undefined) data.images = updates.images;
        if (updates.isFavorite !== undefined) data.isFavorite = updates.isFavorite ? 1 : 0;
        if (updates.rating !== undefined) data.rating = updates.rating;
        if (updates.ingredients !== undefined) data.ingredients = updates.ingredients;
        if (updates.steps !== undefined) data.steps = updates.steps;
        if (updates.tags !== undefined) data.tags = updates.tags;
        if (updates.notes !== undefined) data.notes = updates.notes;
        if (updates.sourceUrl !== undefined) data.sourceUrl = updates.sourceUrl;

        await updateRecipeMutation.mutateAsync({
          id,
          data,
        });

        await refetchRecipes();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to update recipe";
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [updateRecipeMutation, refetchRecipes]
  );

  const deleteRecipe = useCallback(
    async (id: string) => {
      try {
        setLoading(true);
        setError(null);

        await deleteRecipeMutation.mutateAsync({ id });
        await refetchRecipes();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to delete recipe";
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [deleteRecipeMutation, refetchRecipes]
  );

  const getRecipe = useCallback(
    (id: string) => recipes.find((recipe) => recipe.id === id),
    [recipes]
  );

  const toggleFavorite = useCallback(
    async (id: string) => {
      try {
        setLoading(true);
        setError(null);

        await toggleFavoriteMutation.mutateAsync({ id });
        await refetchRecipes();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to toggle favorite";
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [toggleFavoriteMutation, refetchRecipes]
  );

  const searchRecipes = useCallback(
    (query: string) => {
      const lowerQuery = query.toLowerCase();
      return recipes.filter(
        (recipe) =>
          recipe.title.toLowerCase().includes(lowerQuery) ||
          recipe.description?.toLowerCase().includes(lowerQuery) ||
          recipe.notes?.toLowerCase().includes(lowerQuery) ||
          recipe.category?.toLowerCase().includes(lowerQuery) ||
          recipe.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
          recipe.ingredients?.some(
            (ing) => ing.name.toLowerCase().includes(lowerQuery)
          ) ||
          recipe.steps?.some(
            (step) => step.description.toLowerCase().includes(lowerQuery)
          )
      );
    },
    [recipes]
  );

  const getFavoriteRecipes = useCallback(
    () => recipes.filter((recipe) => recipe.isFavorite),
    [recipes]
  );

  const addToDailyMenu = useCallback(
    async (recipeId: string, servings: number) => {
      try {
        setLoading(true);
        setError(null);

        await addToDailyMenuMutation.mutateAsync({ recipeId, servings });
        await refetchDailyMenu();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to add to daily menu";
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [addToDailyMenuMutation, refetchDailyMenu]
  );

  const removeFromDailyMenu = useCallback(
    async (itemId: string) => {
      try {
        setLoading(true);
        setError(null);

        await removeFromDailyMenuMutation.mutateAsync({ id: itemId });
        await refetchDailyMenu();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to remove from daily menu";
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [removeFromDailyMenuMutation, refetchDailyMenu]
  );

  const clearDailyMenu = useCallback(
    async () => {
      try {
        setLoading(true);
        setError(null);

        await clearDailyMenuMutation.mutateAsync();
        await refetchDailyMenu();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to clear daily menu";
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [clearDailyMenuMutation, refetchDailyMenu]
  );

  return (
    <RecipeContext.Provider
      value={{
        recipes,
        dailyMenuItems,
        loading: loading || isLoadingRecipes,
        error,
        addRecipe,
        updateRecipe,
        deleteRecipe,
        getRecipe,
        toggleFavorite,
        searchRecipes,
        getFavoriteRecipes,
        addToDailyMenu,
        removeFromDailyMenu,
        clearDailyMenu,
      }}
    >
      {children}
    </RecipeContext.Provider>
  );
}

export function getAllTags(recipes: Recipe[]): string[] {
  const tags = new Set<string>();
  recipes.forEach((recipe) => {
    recipe.tags?.forEach((tag) => tags.add(tag));
  });
  return Array.from(tags).sort();
}

export function useRecipes() {
  const context = useContext(RecipeContext);
  if (!context) {
    throw new Error("useRecipes must be used within RecipeProvider");
  }
  return context;
}
