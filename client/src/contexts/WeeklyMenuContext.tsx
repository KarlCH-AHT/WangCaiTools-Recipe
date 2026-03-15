import React, { createContext, useContext, useCallback, useMemo } from "react";
import { WeeklyMenu, DailyMenuItem, ShoppingListItem } from "@/types/recipe";
import { useRecipes } from "./RecipeContext";
import { trpc } from "@/lib/trpc";

interface WeeklyMenuContextType {
  weeklyMenus: WeeklyMenu[];
  addWeeklyMenu: (menu: WeeklyMenu) => Promise<void>;
  updateWeeklyMenu: (id: string, menu: Partial<WeeklyMenu>) => Promise<void>;
  deleteWeeklyMenu: (id: string) => Promise<void>;
  getWeeklyMenu: (id: string) => WeeklyMenu | undefined;
  addMenuItemToDay: (menuId: string, day: string, item: DailyMenuItem) => Promise<void>;
  removeMenuItemFromDay: (menuId: string, day: string, recipeId: string) => Promise<void>;
  generateShoppingList: (menuId: string) => ShoppingListItem[];
}

const WeeklyMenuContext = createContext<WeeklyMenuContextType | undefined>(undefined);

export function WeeklyMenuProvider({ children }: { children: React.ReactNode }) {
  const { getRecipe } = useRecipes();
  const utils = trpc.useUtils();
  const { data } = trpc.recipes.listWeeklyMenus.useQuery(undefined, {
    enabled: true,
  });
  const createWeeklyMenuMutation = trpc.recipes.createWeeklyMenu.useMutation();
  const updateWeeklyMenuMutation = trpc.recipes.updateWeeklyMenu.useMutation();
  const deleteWeeklyMenuMutation = trpc.recipes.deleteWeeklyMenu.useMutation();

  const weeklyMenus = useMemo<WeeklyMenu[]>(() => {
    return (data ?? []).map((menu: any) => ({
      id: menu.id,
      title: menu.title ?? undefined,
      startDate: menu.startDate,
      items: menu.items ?? {},
      createdAt: menu.createdAt instanceof Date ? menu.createdAt.toISOString() : String(menu.createdAt ?? ""),
      updatedAt: menu.updatedAt instanceof Date ? menu.updatedAt.toISOString() : String(menu.updatedAt ?? ""),
    }));
  }, [data]);

  const invalidate = useCallback(async () => {
    await utils.recipes.listWeeklyMenus.invalidate();
  }, [utils]);

  const addWeeklyMenu = useCallback(async (menu: WeeklyMenu) => {
    await createWeeklyMenuMutation.mutateAsync({
      title: (menu as any).title,
      startDate: menu.startDate,
      items: menu.items,
    });
    await invalidate();
  }, [createWeeklyMenuMutation, invalidate]);

  const updateWeeklyMenu = useCallback(async (id: string, menu: Partial<WeeklyMenu>) => {
    await updateWeeklyMenuMutation.mutateAsync({
      id,
      title: (menu as any).title,
      startDate: menu.startDate,
      items: menu.items,
    });
    await invalidate();
  }, [invalidate, updateWeeklyMenuMutation]);

  const deleteWeeklyMenu = useCallback(async (id: string) => {
    await deleteWeeklyMenuMutation.mutateAsync({ id });
    await invalidate();
  }, [deleteWeeklyMenuMutation, invalidate]);

  const getWeeklyMenu = useCallback((id: string) => weeklyMenus.find((menu) => menu.id === id), [weeklyMenus]);

  const addMenuItemToDay = useCallback(async (menuId: string, day: string, item: DailyMenuItem) => {
    const menu = weeklyMenus.find((entry) => entry.id === menuId);
    if (!menu) return;
    const dayItems = menu.items[day] || [];
    await updateWeeklyMenu(menuId, {
      items: {
        ...menu.items,
        [day]: [...dayItems.filter((existing) => existing.recipeId !== item.recipeId), item],
      },
    });
  }, [updateWeeklyMenu, weeklyMenus]);

  const removeMenuItemFromDay = useCallback(async (menuId: string, day: string, recipeId: string) => {
    const menu = weeklyMenus.find((entry) => entry.id === menuId);
    if (!menu) return;
    await updateWeeklyMenu(menuId, {
      items: {
        ...menu.items,
        [day]: (menu.items[day] || []).filter((item) => item.recipeId !== recipeId),
      },
    });
  }, [updateWeeklyMenu, weeklyMenus]);

  const generateShoppingList = useCallback((menuId: string): ShoppingListItem[] => {
    const menu = getWeeklyMenu(menuId);
    if (!menu) return [];

    const ingredientMap = new Map<string, { amount: number; unit: string }>();

    Object.values(menu.items).forEach((dayItems) => {
      dayItems.forEach((menuItem) => {
        const recipe = getRecipe(menuItem.recipeId);
        if (!recipe) return;

        recipe.ingredients.forEach((ing) => {
          const scaledAmount = (ing.amount * menuItem.servings) / recipe.servings;
          const key = `${ing.name}|${ing.unit}`;
          const existing = ingredientMap.get(key);
          if (existing) {
            ingredientMap.set(key, {
              amount: existing.amount + scaledAmount,
              unit: existing.unit,
            });
          } else {
            ingredientMap.set(key, {
              amount: scaledAmount,
              unit: ing.unit,
            });
          }
        });
      });
    });

    return Array.from(ingredientMap.entries()).map(([key, value]) => {
      const [name, unit] = key.split("|");
      return {
        name,
        amount: value.amount,
        unit: value.unit,
        checked: false,
      };
    });
  }, [getRecipe, getWeeklyMenu]);

  return (
    <WeeklyMenuContext.Provider
      value={{
        weeklyMenus,
        addWeeklyMenu,
        updateWeeklyMenu,
        deleteWeeklyMenu,
        getWeeklyMenu,
        addMenuItemToDay,
        removeMenuItemFromDay,
        generateShoppingList,
      }}
    >
      {children}
    </WeeklyMenuContext.Provider>
  );
}

export function useWeeklyMenu() {
  const context = useContext(WeeklyMenuContext);
  if (!context) {
    throw new Error("useWeeklyMenu must be used within WeeklyMenuProvider");
  }
  return context;
}
