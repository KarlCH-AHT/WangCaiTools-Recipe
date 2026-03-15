import { useState, useMemo, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useRecipes } from "@/features/recipes";
import { useTranslation, useFormatUnit } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ChevronDown, ChevronUp, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Ingredient, Step } from "@/types/recipe";
import { PortionSelectionDialog } from "@/features/daily-menu";
import LanguageSwitcher from "@/components/LanguageSwitcher";

/**
 * Cooking Mode Page
 * Design: Modern Minimalist with interactive elements
 * - Portion scaling with flexible presets (1/2, 3/4, normal, 1.5x, 2x)
 * - Step-by-step checklist with completion tracking
 * - Ingredient highlighting in steps
 * - Large, readable text for kitchen use
 * - Ingredients displayed at the top for easy reference
 */

const PORTION_PRESETS = [
  { label: "half", multiplier: 0.5 },
  { label: "threeFourths", multiplier: 0.75 },
  { label: "normal", multiplier: 1 },
  { label: "oneAndHalf", multiplier: 1.5 },
  { label: "double", multiplier: 2 },
];

export default function CookingMode() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/cook/:id");
  const { getRecipe } = useRecipes();
  const t = useTranslation();
  const fu = useFormatUnit();
  const [currentServings, setCurrentServings] = useState<number | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [showPortionDialog, setShowPortionDialog] = useState(true);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());

  const recipe = params?.id ? getRecipe(params.id) : undefined;

  // Read portion multiplier from URL query params
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const multiplier = queryParams.get("multiplier");
    if (multiplier && recipe) {
      const mult = parseFloat(multiplier);
      if (!isNaN(mult)) {
        const servings = recipe.servings * mult;
        setCurrentServings(servings);
        setShowPortionDialog(false);
      }
    }
  }, [recipe]);

  const handlePortionConfirm = (selectedServings: number) => {
    setCurrentServings(selectedServings);
    setShowPortionDialog(false);
  };

  // Close portion dialog if open
  if (showPortionDialog && currentServings !== null) {
    setShowPortionDialog(false);
  }

  const servings = currentServings ?? (recipe ? recipe.servings * 1 : 1);
  const scaleFactor = recipe ? servings / recipe.servings : 1;

  const scaledIngredients = useMemo(() => {
    if (!recipe) return [];
    return recipe.ingredients.map((ing) => ({
      ...ing,
      amount: ing.amount * scaleFactor,
    }));
  }, [recipe, scaleFactor]);

  const toggleStep = (stepId: string) => {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(stepId)) {
      newCompleted.delete(stepId);
    } else {
      newCompleted.add(stepId);
    }
    setCompletedSteps(newCompleted);
  };

  const toggleIngredient = (ingredientId: string) => {
    const newChecked = new Set(checkedIngredients);
    if (newChecked.has(ingredientId)) {
      newChecked.delete(ingredientId);
    } else {
      newChecked.add(ingredientId);
    }
    setCheckedIngredients(newChecked);
  };

  const highlightIngredients = (text: string) => {
    if (!recipe) return text;

    let highlightedText = text;
    recipe.ingredients.forEach((ing) => {
      const regex = new RegExp(`\\b${ing.name}\\b`, "gi");
      highlightedText = highlightedText.replace(
        regex,
        `<strong class="text-primary font-bold">${ing.name}</strong>`
      );
    });

    return highlightedText;
  };

  const sortedSteps = useMemo(
    () => [...(recipe?.steps ?? [])].sort((a, b) => (a.number ?? 0) - (b.number ?? 0)),
    [recipe?.steps],
  );
  const groupedSteps = useMemo(() => {
    let localIndex = 1;
    return sortedSteps.map((step) => {
      const isSection = step.description.trim().endsWith(":");
      if (isSection) {
        localIndex = 1;
        return { step, isSection: true, displayIndex: 0 };
      }
      return { step, isSection: false, displayIndex: localIndex++ };
    });
  }, [sortedSteps]);
  const actionableStepCount = groupedSteps.filter((item) => !item.isSection).length;

  if (!recipe) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {t("recipeNotFound")}
            </h2>
            <Button onClick={() => navigate("/")} className="mt-4">
              {t("back")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Initialize portion if not set
  if (currentServings === null && !showPortionDialog) {
    setShowPortionDialog(true);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container py-3 sm:py-4">
          <div className="flex items-center justify-between mb-3">
            <Button
              variant="ghost"
              onClick={() => navigate(`/recipe/${recipe.id}`)}
              className="gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
            >
              <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{t("back")}</span>
            </Button>
            <LanguageSwitcher />
          </div>
          <h1 className="text-lg sm:text-3xl font-display font-bold text-foreground line-clamp-2">
            {recipe.title}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {completedSteps.size} / {actionableStepCount} {t("stepsCompleted")}
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        {/* Portion Selection - At the Top */}
        <Card className="mb-8 border-2 border-primary/20">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">{t("portions")}:</p>
                  <p className="text-2xl font-bold text-foreground">
                    {Math.round(servings * 10) / 10}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  {PORTION_PRESETS.map((preset) => (
                    <Button
                      key={preset.multiplier}
                      variant={servings === recipe.servings * preset.multiplier ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        const newServings = recipe.servings * preset.multiplier;
                        setCurrentServings(newServings);
                      }}
                      className={servings === recipe.servings * preset.multiplier ? "bg-primary text-primary-foreground" : ""}
                    >
                      {preset.multiplier === 0.5 ? "½" : preset.multiplier === 0.75 ? "¾" : preset.multiplier}x
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  value={Math.round(servings * 10) / 10}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val > 0) {
                      setCurrentServings(val);
                    }
                  }}
                  className="flex-1"
                  placeholder={t("portions")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ingredients Section - At the Top */}
        <Card className="mb-8 border-2 border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">{t("ingredients")}</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {checkedIngredients.size} / {scaledIngredients.length}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scaledIngredients.map((ing) => (
                <div
                  key={ing.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    checkedIngredients.has(ing.id)
                      ? "bg-primary/10 border-primary/50 line-through opacity-60"
                      : "bg-background border-border"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checkedIngredients.has(ing.id)}
                    onChange={() => toggleIngredient(ing.id)}
                    className="w-5 h-5 rounded border-border cursor-pointer"
                  />
                  <div className="flex-1">
                    {ing.unit === "__raw__" ? (
                      <div className="text-sm text-foreground">
                        {ing.name.split(/(\d+(?:[.,]\d+)?\s*(?:kg|g|mg|ml|l|EL|TL|个|只|根|勺|茶匙|汤匙|克|少许|适量))/gi).map((part, idx) => {
                          const isToken = /(\d+(?:[.,]\d+)?\s*(?:kg|g|mg|ml|l|EL|TL|个|只|根|勺|茶匙|汤匙|克|少许|适量))/i.test(part);
                          return isToken ? (
                            <span key={`${part}-${idx}`} className="font-semibold text-primary">
                              {part}
                            </span>
                          ) : (
                            <span key={`${part}-${idx}`}>{part}</span>
                          );
                        })}
                      </div>
                    ) : (
                      <>
                        <div className="font-semibold text-foreground">
                          {ing.amount % 1 === 0 ? ing.amount : ing.amount.toFixed(1)}{" "}
                          {fu(ing.unit)}
                        </div>
                        <div className="text-sm text-muted-foreground">{ing.name}</div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Portion Adjustment Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{t("portionAdjustment")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {PORTION_PRESETS.map((preset) => (
                <Button
                  key={preset.multiplier}
                  variant={
                    currentServings === recipe.servings * preset.multiplier
                      ? "default"
                      : "outline"
                  }
                  onClick={() =>
                    setCurrentServings(recipe.servings * preset.multiplier)
                  }
                  className={
                    currentServings === recipe.servings * preset.multiplier
                      ? "bg-primary text-primary-foreground"
                      : ""
                  }
                >
                  {t(preset.label)}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentServings(Math.max(0.5, servings - 0.5))
                }
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
              <div className="flex-1 text-center">
                <div className="text-3xl font-bold text-primary">
                  {servings % 1 === 0 ? servings : servings.toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("portion")}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentServings(servings + 0.5)
                }
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Steps Section */}
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground mb-6">
            {t("instructions")}
          </h2>
          <div className="space-y-4">
            {groupedSteps.map(({ step, isSection, displayIndex }) => (
              <Card
                key={step.id}
                className={`transition-all ${
                  completedSteps.has(step.id)
                    ? "bg-primary/5 border-primary/50"
                    : ""
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    {isSection ? (
                      <div className="w-12 flex-shrink-0" />
                    ) : (
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => toggleStep(step.id)}
                        className={`flex-shrink-0 w-12 h-12 rounded-full p-0 ${
                          completedSteps.has(step.id)
                            ? "bg-primary text-primary-foreground border-primary"
                            : ""
                        }`}
                      >
                        {completedSteps.has(step.id) ? (
                          <Check className="w-6 h-6" />
                        ) : (
                          <span className="text-lg font-bold">{displayIndex}</span>
                        )}
                      </Button>
                    )}

                    <div className="flex-1">
                      <div
                        className={`text-lg leading-relaxed ${
                          isSection ? "font-semibold" : ""
                        } ${
                          completedSteps.has(step.id)
                            ? "line-through text-muted-foreground"
                            : "text-foreground"
                        }`}
                        dangerouslySetInnerHTML={{
                          __html: highlightIngredients(
                            isSection ? step.description.replace(/:\s*$/, "") : step.description,
                          ),
                        }}
                      />
                      {!isSection && step.duration && (
                        <div className="text-sm text-muted-foreground mt-2">
                          ⏱️ {step.duration} {t("min")}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Finished State */}
        {actionableStepCount > 0 && completedSteps.size === actionableStepCount && (
          <Card className="mt-8 bg-primary/5 border-primary/50">
            <CardContent className="p-8 text-center">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-3xl font-display font-bold text-foreground mb-2">
                {t("finished")}
              </h2>
              <p className="text-lg text-muted-foreground">
                {recipe.title} {t("finishedDesc")}
              </p>
              <Button
                onClick={() => navigate("/")}
                className="mt-6 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {t("back")}
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
