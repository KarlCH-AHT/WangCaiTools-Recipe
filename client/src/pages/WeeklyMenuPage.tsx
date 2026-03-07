import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Download } from "lucide-react";
import { useWeeklyMenu } from "@/contexts/WeeklyMenuContext";
import { useRecipes } from "@/contexts/RecipeContext";
import { useTranslation, useFormatUnit } from "@/hooks/useTranslation";
import { nanoid } from "nanoid";
import { WeeklyMenu } from "@/types/recipe";

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
  const { weeklyMenus, addWeeklyMenu, deleteWeeklyMenu, generateShoppingList } = useWeeklyMenu();
  const { recipes } = useRecipes();
  const t = useTranslation();
  const fu = useFormatUnit();
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);

  const createNewWeeklyMenu = () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - startDate.getDay() + 1); // Set to Monday
    const menu: WeeklyMenu = {
      id: nanoid(),
      startDate: startDate.toISOString().split("T")[0],
      items: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addWeeklyMenu(menu);
    setSelectedMenuId(menu.id);
  };

  const selectedMenu = selectedMenuId ? weeklyMenus.find((m) => m.id === selectedMenuId) : null;
  const shoppingList = selectedMenu ? generateShoppingList(selectedMenu.id) : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50 py-6">
        <div className="container">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">
                {t("weeklyMenu") || "Weekly Menu"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {t("planYourWeek") || "Plan your meals for the week"}
              </p>
            </div>
            <Button onClick={createNewWeeklyMenu} className="gap-2">
              <Plus className="w-4 h-4" />
              {t("newWeeklyMenu") || "New Menu"}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        {weeklyMenus.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {t("noWeeklyMenus") || "No weekly menus yet"}
            </p>
            <Button onClick={createNewWeeklyMenu} className="gap-2">
              <Plus className="w-4 h-4" />
              {t("createFirstWeeklyMenu") || "Create first menu"}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Menu List */}
            <div className="lg:col-span-1">
              <h2 className="text-lg font-semibold mb-4">{t("myMenus") || "My Menus"}</h2>
              <div className="space-y-2">
                {weeklyMenus.map((menu) => (
                  <Card
                    key={menu.id}
                    className={`cursor-pointer transition-all ${
                      selectedMenuId === menu.id
                        ? "border-primary bg-primary/5"
                        : "hover:border-border"
                    }`}
                    onClick={() => setSelectedMenuId(menu.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{menu.startDate}</p>
                          <p className="text-xs text-muted-foreground">
                            {Object.values(menu.items).flat().length} items
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteWeeklyMenu(menu.id);
                            if (selectedMenuId === menu.id) setSelectedMenuId(null);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Menu Details */}
            {selectedMenu && (
              <div className="lg:col-span-2">
                <div className="space-y-6">
                  {/* Weekly View */}
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("weekPlan") || "Week Plan"}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {DAYS.map((day) => (
                          <div key={day} className="border-b pb-4 last:border-b-0">
                            <h3 className="font-semibold mb-2">{DAY_LABELS[day]}</h3>
                            <div className="space-y-2">
                              {(selectedMenu.items[day] || []).map((item) => {
                                const recipe = recipes.find((r) => r.id === item.recipeId);
                                return (
                                  <div key={item.recipeId} className="text-sm p-2 bg-muted rounded">
                                    {recipe?.title} ({item.servings} {t("servings")})
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Shopping List */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>{t("shoppingList") || "Shopping List"}</CardTitle>
                        <Button variant="outline" size="sm" className="gap-2">
                          <Download className="w-4 h-4" />
                          {t("export") || "Export"}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {shoppingList.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 border-b">
                            <span>
                              {item.name} ({item.amount} {fu(item.unit)})
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
