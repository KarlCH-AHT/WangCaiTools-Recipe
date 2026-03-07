import React, { createContext, useContext, useState, useCallback } from "react";
import { WeeklyMenu, DailyMenuItem, ShoppingListItem } from "@/types/recipe";
import { useRecipes } from "./RecipeContext";

interface WeeklyMenuContextType {
  weeklyMenus: WeeklyMenu[];
  addWeeklyMenu: (menu: WeeklyMenu) => void;
  updateWeeklyMenu: (id: string, menu: Partial<WeeklyMenu>) => void;
  deleteWeeklyMenu: (id: string) => void;
  getWeeklyMenu: (id: string) => WeeklyMenu | undefined;
  addMenuItemToDay: (menuId: string, day: string, item: DailyMenuItem) => void;
  removeMenuItemFromDay: (menuId: string, day: string, recipeId: string) => void;
  generateShoppingList: (menuId: string) => ShoppingListItem[];
}

const WeeklyMenuContext = createContext<WeeklyMenuContextType | undefined>(undefined);

export function WeeklyMenuProvider({ children }: { children: React.ReactNode }) {
  const { getRecipe } = useRecipes();
  const [weeklyMenus, setWeeklyMenus] = useState<WeeklyMenu[]>(() => {
    const stored = localStorage.getItem("weeklyMenus");
    return stored ? JSON.parse(stored) : [];
  });

  const saveToLocalStorage = useCallback((updated: WeeklyMenu[]) => {
    localStorage.setItem("weeklyMenus", JSON.stringify(updated));
  }, []);

  const addWeeklyMenu = useCallback(
    (menu: WeeklyMenu) => {
      const updated = [...weeklyMenus, menu];
      setWeeklyMenus(updated);
      saveToLocalStorage(updated);
    },
    [weeklyMenus, saveToLocalStorage]
  );

  const updateWeeklyMenu = useCallback(
    (id: string, updates: Partial<WeeklyMenu>) => {
      const updated = weeklyMenus.map((menu) =>
        menu.id === id ? { ...menu, ...updates } : menu
      );
      setWeeklyMenus(updated);
      saveToLocalStorage(updated);
    },
    [weeklyMenus, saveToLocalStorage]
  );

  const deleteWeeklyMenu = useCallback(
    (id: string) => {
      const updated = weeklyMenus.filter((menu) => menu.id !== id);
      setWeeklyMenus(updated);
      saveToLocalStorage(updated);
    },
    [weeklyMenus, saveToLocalStorage]
  );

  const getWeeklyMenu = useCallback(
    (id: string) => weeklyMenus.find((menu) => menu.id === id),
    [weeklyMenus]
  );

  const addMenuItemToDay = useCallback(
    (menuId: string, day: string, item: DailyMenuItem) => {
      const updated = weeklyMenus.map((menu) => {
        if (menu.id === menuId) {
          const dayItems = menu.items[day] || [];
          return {
            ...menu,
            items: {
              ...menu.items,
              [day]: [...dayItems, item],
            },
          };
        }
        return menu;
      });
      setWeeklyMenus(updated);
      saveToLocalStorage(updated);
    },
    [weeklyMenus, saveToLocalStorage]
  );

  const removeMenuItemFromDay = useCallback(
    (menuId: string, day: string, recipeId: string) => {
      const updated = weeklyMenus.map((menu) => {
        if (menu.id === menuId) {
          const dayItems = menu.items[day] || [];
          return {
            ...menu,
            items: {
              ...menu.items,
              [day]: dayItems.filter((item) => item.recipeId !== recipeId),
            },
          };
        }
        return menu;
      });
      setWeeklyMenus(updated);
      saveToLocalStorage(updated);
    },
    [weeklyMenus, saveToLocalStorage]
  );

  const generateShoppingList = useCallback(
    (menuId: string): ShoppingListItem[] => {
      const menu = getWeeklyMenu(menuId);
      if (!menu) return [];

      const ingredientMap = new Map<string, { amount: number; unit: string }>();

      Object.values(menu.items).forEach((dayItems) => {
        dayItems.forEach((menuItem) => {
          const recipe = getRecipe(menuItem.recipeId);
          if (recipe) {
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
          }
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
    },
    [getWeeklyMenu, getRecipe]
  );

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
