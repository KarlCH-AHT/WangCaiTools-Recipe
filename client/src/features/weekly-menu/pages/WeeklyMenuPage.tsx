import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, CalendarDays, ShoppingBasket, ChevronRight, Check } from "lucide-react";
import { useWeeklyMenu } from "@/features/weekly-menu";
import { useRecipes } from "@/features/recipes";
import { useTranslation, useFormatUnit } from "@/hooks/useTranslation";
import { nanoid } from "nanoid";
import { WeeklyMenu } from "@/types/recipe";
import { formatLocalDate } from "@/lib/date";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_LABELS: Record<string, string> = {
  monday: "Montag",
  tuesday: "Dienstag",
  wednesday: "Mittwoch",
  thursday: "Donnerstag",
  friday: "Freitag",
  saturday: "Samstag",
  sunday: "Sonntag",
};

export default function WeeklyMenuPage() {
  const [, navigate] = useLocation();
  const { weeklyMenus, addWeeklyMenu, updateWeeklyMenu, deleteWeeklyMenu, addMenuItemToDay, removeMenuItemFromDay, generateShoppingList } = useWeeklyMenu();
  const { recipes } = useRecipes();
  const t = useTranslation();
  const fu = useFormatUnit();
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>("monday");
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>("");
  const [draftTitle, setDraftTitle] = useState("");

  const createNewWeeklyMenu = async () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - startDate.getDay() + 1);
    const localStartDate = formatLocalDate(startDate);
    const menu: WeeklyMenu = {
      id: nanoid(),
      title: `${t("weeklyMenu") || "Weekly Menu"} ${localStartDate}`,
      startDate: localStartDate,
      items: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await addWeeklyMenu(menu);
  };

  const selectedMenu = selectedMenuId ? weeklyMenus.find((m) => m.id === selectedMenuId) : weeklyMenus[0] || null;
  const effectiveMenuId = selectedMenu?.id ?? null;
  const shoppingList = effectiveMenuId ? generateShoppingList(effectiveMenuId) : [];

  useEffect(() => {
    if (selectedMenu) {
      setDraftTitle(selectedMenu.title || "");
    }
  }, [selectedMenu]);

  const recipesInSelectedDay = useMemo(() => {
    if (!selectedMenu) return [];
    return selectedMenu.items[selectedDay] || [];
  }, [selectedDay, selectedMenu]);

  const plannedRecipeIds = useMemo(() => {
    if (!selectedMenu) return new Set<string>();
    return new Set(Object.values(selectedMenu.items).flat().map((item) => item.recipeId));
  }, [selectedMenu]);

  const suggestionRecipes = useMemo(() => {
    return recipes.filter((recipe) => !plannedRecipeIds.has(recipe.id)).slice(0, 8);
  }, [plannedRecipeIds, recipes]);

  const handleAssignRecipe = async () => {
    if (!effectiveMenuId || !selectedRecipeId) return;
    const recipe = recipes.find((item) => item.id === selectedRecipeId);
    if (!recipe) return;
    await addMenuItemToDay(effectiveMenuId, selectedDay, {
      recipeId: recipe.id,
      servings: recipe.servings,
    });
    setSelectedRecipeId("");
  };

  const handleDuplicateWeek = async () => {
    if (!selectedMenu) return;
    const nextWeek = new Date(selectedMenu.startDate);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekDate = formatLocalDate(nextWeek);
    await addWeeklyMenu({
      ...selectedMenu,
      id: nanoid(),
      title: `${selectedMenu.title || t("weeklyMenu") || "Weekly Menu"} copy`,
      startDate: nextWeekDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSaveMenuTitle = async () => {
    if (!selectedMenu) return;
    const nextTitle = draftTitle.trim() || `${t("weeklyMenu") || "Weekly Menu"} ${selectedMenu.startDate}`;
    if (nextTitle === (selectedMenu.title || "")) return;
    await updateWeeklyMenu(selectedMenu.id, { title: nextTitle });
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_rgba(236,253,255,0.8),_rgba(255,255,255,1)_24%)]">
      <header className="border-b border-border bg-card/90 sticky top-0 z-50 py-5 backdrop-blur-md">
        <div className="container flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-700/80">
              {t("weeklyPlanningFocus") || "Weekly planning"}
            </p>
            <h1 className="mt-1 text-3xl font-bold text-foreground">
              {t("weeklyMenu") || "Weekly Menu"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("planYourWeek") || "Plan your meals for the week"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/menu")}>
              {t("menuOverview") || "Menu Overview"}
            </Button>
            <Button onClick={createNewWeeklyMenu} className="gap-2">
              <Plus className="w-4 h-4" />
              {t("newWeeklyMenu") || "New Menu"}
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6">
        {weeklyMenus.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-cyan-200 bg-white/80 p-12 text-center">
            <CalendarDays className="mx-auto h-10 w-10 text-cyan-600" />
            <p className="mt-4 text-base font-semibold text-foreground">{t("noWeeklyMenus") || "No weekly menus yet"}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t("createFirstWeeklyMenu") || "Create first menu"}</p>
            <Button onClick={createNewWeeklyMenu} className="mt-5">
              {t("createFirstWeeklyMenu") || "Create first menu"}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
            <section className="space-y-3">
              {weeklyMenus.map((menu) => {
                const isActive = (selectedMenuId || weeklyMenus[0]?.id) === menu.id;
                const itemCount = Object.values(menu.items).flat().length;
                return (
                  <Card
                    key={menu.id}
                    className={`cursor-pointer transition-all ${isActive ? "border-cyan-400 bg-cyan-50/70" : "hover:border-cyan-200"}`}
                    onClick={() => setSelectedMenuId(menu.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">{menu.title || menu.startDate}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{menu.startDate}</p>
                          <p className="mt-2 text-xs text-muted-foreground">{itemCount} {t("selectedCount") || "selected"}</p>
                        </div>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            await deleteWeeklyMenu(menu.id);
                            if (selectedMenuId === menu.id) setSelectedMenuId(null);
                          }}
                          className="rounded-xl p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </section>

            {selectedMenu && (
              <section className="space-y-5">
                <div className="rounded-3xl border border-cyan-200/70 bg-white/90 p-4 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <input
                        value={draftTitle}
                        onChange={(e) => setDraftTitle(e.target.value)}
                        className="w-full rounded-xl border border-transparent bg-transparent px-0 text-xl font-semibold text-foreground outline-none focus:border-cyan-200 focus:bg-cyan-50/40"
                        placeholder={selectedMenu.startDate}
                      />
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t("menuWorkbenchDesc") || "Planning view for your weekly family meals"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={handleDuplicateWeek}>
                        {t("tryAgain") || "Duplicate"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleSaveMenuTitle}
                        disabled={(draftTitle.trim() || "") === (selectedMenu.title || "")}
                      >
                        {t("saveChanges") || "Save changes"}
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 md:grid-cols-7">
                    {DAYS.map((day) => {
                      const active = selectedDay === day;
                      const count = (selectedMenu.items[day] || []).length;
                      return (
                        <button
                          key={day}
                          onClick={() => setSelectedDay(day)}
                          className={`rounded-2xl border px-3 py-3 text-left transition-colors ${active ? "border-cyan-500 bg-cyan-50" : "border-border bg-background hover:bg-muted/40"}`}
                        >
                          <p className="text-xs text-muted-foreground">{DAY_LABELS[day]}</p>
                          <p className="mt-1 text-sm font-semibold text-foreground">{count} {t("recipes") || "recipes"}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
                  <Card>
                    <CardHeader>
                      <CardTitle>{DAY_LABELS[selectedDay]}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex gap-2">
                        <select
                          value={selectedRecipeId}
                          onChange={(e) => setSelectedRecipeId(e.target.value)}
                          className="h-10 flex-1 rounded-xl border border-input bg-background px-3 text-sm"
                        >
                          <option value="">{t("addToMenu") || "Add to menu"}</option>
                          {recipes.map((recipe) => (
                            <option key={recipe.id} value={recipe.id}>
                              {recipe.title}
                            </option>
                          ))}
                        </select>
                        <Button onClick={handleAssignRecipe} disabled={!selectedRecipeId}>
                          {t("add") || "Add"}
                        </Button>
                      </div>

                      {recipesInSelectedDay.length === 0 ? (
                        <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                          {t("timelineEmpty") || "Add recipes to start planning the day"}
                        </div>
                      ) : (
                        recipesInSelectedDay.map((item) => {
                          const recipe = recipes.find((entry) => entry.id === item.recipeId);
                          if (!recipe) return null;
                          return (
                            <div key={item.recipeId} className="rounded-2xl border bg-background p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-semibold text-foreground">{recipe.title}</p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {item.servings} {t("servingsUnit") || "servings"}
                                    {recipe.cookTime ? ` · ${recipe.cookTime}${t("min") || "min"}` : ""}
                                  </p>
                                </div>
                                <button
                                  onClick={() => removeMenuItemFromDay(selectedMenu.id, selectedDay, item.recipeId)}
                                  className="rounded-xl p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>{t("randomRecommendation") || "Suggestions"}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {suggestionRecipes.map((recipe) => (
                        <button
                          key={recipe.id}
                          onClick={() => setSelectedRecipeId(recipe.id)}
                          className="flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left hover:bg-muted/30"
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">{recipe.title}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{recipe.category || t("recipes")}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </button>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </section>
            )}

            {selectedMenu && (
              <aside className="space-y-4">
                <Card className="sticky top-24">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingBasket className="h-4 w-4 text-cyan-700" />
                      {t("shoppingList") || "Shopping List"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {shoppingList.map((item, idx) => (
                      <div key={`${item.name}-${idx}`} className="flex items-center gap-3 rounded-2xl border px-3 py-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
                          <Check className="h-3 w-3" />
                        </span>
                        <span className="text-sm text-foreground">
                          {item.amount % 1 === 0 ? item.amount : item.amount.toFixed(1)} {fu(item.unit)} {item.name}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </aside>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
