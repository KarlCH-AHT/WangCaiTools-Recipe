import React, { createContext, useContext, useState, useCallback } from "react";
import { DailyMenu, DailyMenuItem } from "@/types/recipe";
import { nanoid } from "nanoid";

interface DailyMenuContextType {
  dailyMenu: DailyMenu | null;
  addMenuItem: (recipeId: string, servings: number) => void;
  removeMenuItem: (recipeId: string) => void;
  updateMenuItem: (recipeId: string, servings: number) => void;
  clearMenu: () => void;
  getTodayMenu: () => DailyMenu;
}

const DailyMenuContext = createContext<DailyMenuContextType | undefined>(undefined);

function getTodayDateString(): string {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

export function DailyMenuProvider({ children }: { children: React.ReactNode }) {
  const [dailyMenu, setDailyMenu] = useState<DailyMenu | null>(() => {
    const stored = localStorage.getItem("dailyMenu");
    if (stored) {
      const menu = JSON.parse(stored);
      // If the stored menu is from a different day, start fresh
      if (menu.date !== getTodayDateString()) {
        return null;
      }
      return menu;
    }
    return null;
  });

  const saveToLocalStorage = useCallback((menu: DailyMenu) => {
    localStorage.setItem("dailyMenu", JSON.stringify(menu));
  }, []);

  const getTodayMenu = useCallback((): DailyMenu => {
    if (dailyMenu && dailyMenu.date === getTodayDateString()) {
      return dailyMenu;
    }
    const newMenu: DailyMenu = {
      id: nanoid(),
      date: getTodayDateString(),
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setDailyMenu(newMenu);
    saveToLocalStorage(newMenu);
    return newMenu;
  }, [dailyMenu, saveToLocalStorage]);

  const addMenuItem = useCallback(
    (recipeId: string, servings: number) => {
      const menu = getTodayMenu();
      const existingItem = menu.items.find((item) => item.recipeId === recipeId);

      let updatedItems: DailyMenuItem[];
      if (existingItem) {
        // If recipe already in menu, update servings
        updatedItems = menu.items.map((item) =>
          item.recipeId === recipeId ? { ...item, servings } : item
        );
      } else {
        // Add new item
        updatedItems = [...menu.items, { recipeId, servings }];
      }

      const updatedMenu: DailyMenu = {
        ...menu,
        items: updatedItems,
        updatedAt: new Date().toISOString(),
      };
      setDailyMenu(updatedMenu);
      saveToLocalStorage(updatedMenu);
    },
    [getTodayMenu, saveToLocalStorage]
  );

  const removeMenuItem = useCallback(
    (recipeId: string) => {
      const menu = getTodayMenu();
      const updatedItems = menu.items.filter((item) => item.recipeId !== recipeId);
      const updatedMenu: DailyMenu = {
        ...menu,
        items: updatedItems,
        updatedAt: new Date().toISOString(),
      };
      setDailyMenu(updatedMenu);
      saveToLocalStorage(updatedMenu);
    },
    [getTodayMenu, saveToLocalStorage]
  );

  const updateMenuItem = useCallback(
    (recipeId: string, servings: number) => {
      const menu = getTodayMenu();
      const updatedItems = menu.items.map((item) =>
        item.recipeId === recipeId ? { ...item, servings } : item
      );
      const updatedMenu: DailyMenu = {
        ...menu,
        items: updatedItems,
        updatedAt: new Date().toISOString(),
      };
      setDailyMenu(updatedMenu);
      saveToLocalStorage(updatedMenu);
    },
    [getTodayMenu, saveToLocalStorage]
  );

  const clearMenu = useCallback(() => {
    const newMenu: DailyMenu = {
      id: nanoid(),
      date: getTodayDateString(),
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setDailyMenu(newMenu);
    saveToLocalStorage(newMenu);
  }, [saveToLocalStorage]);

  return (
    <DailyMenuContext.Provider
      value={{
        dailyMenu: dailyMenu || getTodayMenu(),
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
  // Ensure dailyMenu is never null
  return {
    ...context,
    dailyMenu: context.dailyMenu || context.getTodayMenu(),
  };
}
