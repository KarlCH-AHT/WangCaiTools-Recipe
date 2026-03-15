import React, { createContext, useContext, useMemo, useCallback } from "react";
import { DailyMenu } from "@/types/recipe";
import { trpc } from "@/lib/trpc";
import { formatLocalDate } from "@/lib/date";

interface DailyMenuContextType {
  dailyMenu: DailyMenu;
  addMenuItem: (recipeId: string, servings: number) => Promise<void>;
  removeMenuItem: (recipeId: string) => Promise<void>;
  updateMenuItem: (recipeId: string, servings: number) => Promise<void>;
  clearMenu: () => Promise<void>;
  getTodayMenu: () => DailyMenu;
}

const DailyMenuContext = createContext<DailyMenuContextType | undefined>(undefined);

function getTodayDateString(): string {
  return formatLocalDate(new Date());
}

export function DailyMenuProvider({ children }: { children: React.ReactNode }) {
  const utils = trpc.useUtils();
  const { data } = trpc.recipes.getDailyMenu.useQuery(undefined, {
    enabled: true,
  });
  const addToDailyMenuMutation = trpc.recipes.addToDailyMenu.useMutation();
  const updateDailyMenuMutation = trpc.recipes.updateDailyMenuItem.useMutation();
  const removeDailyMenuMutation = trpc.recipes.removeFromDailyMenuByRecipe.useMutation();
  const clearDailyMenuMutation = trpc.recipes.clearDailyMenu.useMutation();

  const dailyMenu = useMemo<DailyMenu>(() => {
    return {
      id: "server-daily-menu",
      date: getTodayDateString(),
      items: (data ?? []).map((item: any) => ({
        recipeId: item.recipeId,
        servings: item.servings,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [data]);

  const invalidate = useCallback(async () => {
    await utils.recipes.getDailyMenu.invalidate();
  }, [utils]);

  const addMenuItem = useCallback(async (recipeId: string, servings: number) => {
    await addToDailyMenuMutation.mutateAsync({ recipeId, servings });
    await invalidate();
  }, [addToDailyMenuMutation, invalidate]);

  const removeMenuItem = useCallback(async (recipeId: string) => {
    await removeDailyMenuMutation.mutateAsync({ recipeId });
    await invalidate();
  }, [removeDailyMenuMutation, invalidate]);

  const updateMenuItem = useCallback(async (recipeId: string, servings: number) => {
    await updateDailyMenuMutation.mutateAsync({ recipeId, servings });
    await invalidate();
  }, [updateDailyMenuMutation, invalidate]);

  const clearMenu = useCallback(async () => {
    await clearDailyMenuMutation.mutateAsync();
    await invalidate();
  }, [clearDailyMenuMutation, invalidate]);

  const getTodayMenu = useCallback(() => dailyMenu, [dailyMenu]);

  return (
    <DailyMenuContext.Provider
      value={{
        dailyMenu,
        addMenuItem,
        removeMenuItem,
        updateMenuItem,
        clearMenu,
        getTodayMenu,
      }}
    >
      {children}
    </DailyMenuContext.Provider>
  );
}

export function useDailyMenu() {
  const context = useContext(DailyMenuContext);
  if (!context) {
    throw new Error("useDailyMenu must be used within DailyMenuProvider");
  }
  return context;
}
