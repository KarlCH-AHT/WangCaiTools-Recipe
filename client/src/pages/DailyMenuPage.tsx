import { useState, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Trash2, ChevronUp, ChevronDown, ShoppingCart, Clock, ChefHat, Share2, Check } from "lucide-react";
import { useRecipes } from "@/contexts/RecipeContext";
import { useDailyMenu } from "@/contexts/DailyMenuContext";
import { useTranslation, useFormatUnit } from "@/hooks/useTranslation";

/**
 * Daily Menu Page – iOS/Notion-inspired redesign
 * - Clean recipe list with portion adjusters
 * - Integrated shopping list with checkboxes
 * - Share / copy list functionality
 */

export default function DailyMenuPage() {
  const [, navigate] = useLocation();
  const { getRecipe } = useRecipes();
  const { dailyMenu, removeMenuItem, updateMenuItem, clearMenu } = useDailyMenu();
  const t = useTranslation();
  const fu = useFormatUnit();
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const menuItems = useMemo(() => {
    return dailyMenu.items
      .map((item) => {
        const recipe = getRecipe(item.recipeId);
        return recipe ? { ...item, recipe } : null;
      })
      .filter(Boolean) as Array<{ recipeId: string; servings: number; recipe: any }>;
  }, [dailyMenu.items, getRecipe]);

  // Combine ingredients across all menu items, scaled by portion
  const combinedIngredients = useMemo(() => {
    const map = new Map<string, { name: string; amount: number; unit: string }>();
    menuItems.forEach((item) => {
      const scale = item.servings / item.recipe.servings;
      item.recipe.ingredients.forEach((ing: any) => {
        const unit = (ing.unit ?? "").toString();
        const amount = Number(ing.amount ?? 0);
        const isRawLine = unit === "__raw__" || unit.trim() === "" || !Number.isFinite(amount) || amount <= 0;
        if (isRawLine) {
          const key = `${ing.name}__raw`;
          if (!map.has(key)) {
            map.set(key, { name: ing.name, amount: 0, unit: "__raw__" });
          }
          return;
        }
        const key = `${ing.name}__${ing.unit}`;
        const existing = map.get(key);
        if (existing) {
          existing.amount += amount * scale;
        } else {
          map.set(key, { name: ing.name, amount: amount * scale, unit });
        }
      });
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [menuItems]);

  const totalCookTime = useMemo(
    () => menuItems.reduce((s, i) => s + (i.recipe.cookTime || 0), 0),
    [menuItems]
  );

  const toggleCheck = useCallback((key: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleCopyList = useCallback(() => {
    const text = combinedIngredients
      .map((ing) => {
        if (ing.unit === "__raw__" || !Number.isFinite(ing.amount) || ing.amount <= 0) {
          return `• ${ing.name}`;
        }
        const amt = ing.amount % 1 === 0 ? ing.amount : ing.amount.toFixed(1);
        const unitText = fu(ing.unit);
        return unitText ? `• ${amt} ${unitText} ${ing.name}` : `• ${amt} ${ing.name}`;
      })
      .join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [combinedIngredients]);

  const uncheckedCount = combinedIngredients.length - checkedItems.size;

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* ── Header ── */}
      <header className="bg-background/80 backdrop-blur-md sticky top-0 z-50 border-b border-border/50">
        <div className="container py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/menu")}
                className="icon-btn"
              >
                <ArrowLeft className="w-4.5 h-4.5" />
              </button>
              <div>
                <h1 className="text-base font-bold text-foreground leading-tight" style={{ letterSpacing: "-0.02em" }}>
                  {t("todayMenu")}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {menuItems.length} {t("recipes")} · {combinedIngredients.length} {t("ingredients")}
                </p>
              </div>
            </div>
            {menuItems.length > 0 && (
              <button
                onClick={clearMenu}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-destructive bg-destructive/10 hover:bg-destructive/15 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t("clearMenu")}
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="container py-4 lg:py-5">
        {menuItems.length === 0 ? (
          /* ── Empty state ── */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center mb-5 shadow-sm">
              <span className="text-4xl">🛒</span>
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1.5">{t("emptyMenu")}</h3>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-6">{t("selectRecipes")}</p>
            <button
              onClick={() => navigate("/menu")}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold transition-all hover:bg-primary/90 active:scale-95"
            >
              <ChefHat className="w-4 h-4" />
              {t("browse")}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* ── Left: Recipe list ── */}
            <div className="lg:col-span-3 space-y-3">
              {/* Summary pills */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-lg text-xs font-medium text-foreground">
                  <ChefHat className="w-3.5 h-3.5 text-primary" />
                  {menuItems.length} {t("recipes")}
                </div>
                {totalCookTime > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-lg text-xs font-medium text-foreground">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    {totalCookTime} {t("min")}
                  </div>
                )}
              </div>

              {menuItems.map((item) => {
                const { recipe } = item;
                const firstImg = recipe.images?.[0] || recipe.imageUrl;
                return (
                  <div
                    key={recipe.id}
                    className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden"
                  >
                    <div className="flex items-center gap-3 p-3.5">
                      {/* Thumbnail */}
                      <div
                        className="w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-orange-50 to-amber-50 flex-shrink-0 cursor-pointer"
                        onClick={() => navigate(`/recipe/${recipe.id}`)}
                      >
                        {firstImg ? (
                          <img src={firstImg} alt={recipe.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">
                            🍽️
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-semibold text-foreground leading-tight truncate cursor-pointer hover:text-primary transition-colors"
                          onClick={() => navigate(`/recipe/${recipe.id}`)}
                        >
                          {recipe.title}
                        </p>
                        {recipe.cookTime && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            <Clock className="w-3 h-3 inline mr-0.5" />
                            {recipe.cookTime} {t("min")}
                          </p>
                        )}
                        {/* Portion adjuster */}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground">{t("portion")}:</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => updateMenuItem(recipe.id, Math.max(0.5, item.servings - 0.5))}
                              className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-8 text-center text-sm font-semibold text-foreground">
                              {item.servings % 1 === 0 ? item.servings : item.servings.toFixed(1)}
                            </span>
                            <button
                              onClick={() => updateMenuItem(recipe.id, item.servings + 0.5)}
                              className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => removeMenuItem(recipe.id)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Right: Shopping list ── */}
            <div className="lg:col-span-2">
              <div className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden sticky top-20">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">{t("shoppingList")}</span>
                    {uncheckedCount > 0 && (
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                        {uncheckedCount}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleCopyList}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-all"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-500" />
                        <span className="text-green-600">已复制</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5" />
                        复制清单
                      </>
                    )}
                  </button>
                </div>

                {/* Ingredients */}
                <div className="p-3 max-h-[60vh] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                  {combinedIngredients.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      {t("noIngredients") || "暂无食材"}
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {combinedIngredients.map((ing, idx) => {
                        const key = `${ing.name}__${ing.unit}`;
                        const isChecked = checkedItems.has(key);
                        const showAmount = Number.isFinite(ing.amount) && ing.amount > 0 && ing.unit !== "__raw__";
                        const amt = showAmount
                          ? (ing.amount % 1 === 0 ? ing.amount : ing.amount.toFixed(1))
                          : null;
                        const unitText = showAmount ? fu(ing.unit) : "";
                        return (
                          <button
                            key={idx}
                            onClick={() => toggleCheck(key)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                              isChecked ? "opacity-40" : "hover:bg-muted/60"
                            }`}
                          >
                            <div
                              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                isChecked
                                  ? "bg-primary border-primary"
                                  : "border-border"
                              }`}
                            >
                              {isChecked && <Check className="w-3 h-3 text-primary-foreground" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className={`text-sm font-medium ${isChecked ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                {ing.name}
                              </span>
                            </div>
                            {showAmount ? (
                              <span className="text-xs text-muted-foreground flex-shrink-0">
                                {unitText ? `${amt} ${unitText}` : amt}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Footer: progress */}
                {combinedIngredients.length > 0 && (
                  <div className="px-4 py-3 border-t border-border/50">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                      <span>已勾选 {checkedItems.size} / {combinedIngredients.length}</span>
                      {checkedItems.size > 0 && (
                        <button
                          onClick={() => setCheckedItems(new Set())}
                          className="text-primary hover:underline"
                        >
                          重置
                        </button>
                      )}
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${combinedIngredients.length > 0 ? (checkedItems.size / combinedIngredients.length) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
