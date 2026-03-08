import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Eye, Plus, Shuffle, X } from "lucide-react";
import { Recipe } from "@/types/recipe";
import { useTranslation } from "@/hooks/useTranslation";

interface RandomRecommendationProps {
  recipes: Recipe[];
  onAddToTodayMenu: (recipe: Recipe) => void;
  onPreviewRecipe: (recipe: Recipe) => void;
  isInTodayMenu?: (recipeId: string) => boolean;
}

export default function RandomRecommendation({
  recipes,
  onAddToTodayMenu,
  onPreviewRecipe,
  isInTodayMenu,
}: RandomRecommendationProps) {
  const t = useTranslation();
  const [recommendations, setRecommendations] = useState<Recipe[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [count, setCount] = useState(2);

  const getRandomRecipes = (n: number) => {
    if (recipes.length === 0) return [];
    const shuffled = [...recipes].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(n, recipes.length));
  };

  const handleRecommend = () => {
    setRecommendations(getRandomRecipes(count));
    setExpanded(true);
  };

  const handleClose = () => {
    setExpanded(false);
    setRecommendations([]);
  };

  if (recipes.length === 0) return null;

  return (
    <div className="mb-4 rounded-2xl border bg-white/80 p-3 backdrop-blur-sm dark:bg-zinc-900/70">
      {!expanded ? (
        <div className="flex items-center gap-2">
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Shuffle className="h-4 w-4" />
          </div>
          <p className="flex-1 text-sm font-medium text-foreground">{t("randomRecommendation")}</p>

          <div className="flex items-center rounded-full border bg-zinc-50 p-0.5 dark:bg-zinc-800">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className={`h-6 w-6 rounded-full text-xs transition-colors ${
                  count === n ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          <Button size="sm" onClick={handleRecommend} className="h-8 rounded-full px-3 text-xs">
            <Shuffle className="mr-1 h-3.5 w-3.5" />
            {t("getRecommendation")}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shuffle className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">{t("randomRecommendation")}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" onClick={handleRecommend} className="h-7 rounded-full px-2.5 text-xs">
                {t("tryAgain")}
              </Button>
              <button
                onClick={handleClose}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border text-muted-foreground hover:text-foreground"
                aria-label="Close recommendations"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
            {recommendations.map((recipe) => {
              const thumb = recipe.images?.[0] || recipe.imageUrl;
              const inMenu = isInTodayMenu?.(recipe.id) ?? false;
              return (
                <div
                  key={recipe.id}
                  className="recipe-card group overflow-hidden"
                >
                  <div className="relative w-full aspect-square overflow-hidden bg-muted">
                    {thumb ? <img src={thumb} alt={recipe.title} className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="p-2">
                    <p className="line-clamp-2 text-xs font-semibold text-foreground">{recipe.title}</p>
                    <div className="mt-1.5 flex items-center gap-1">
                      <button
                        onClick={() => onPreviewRecipe(recipe)}
                        className="flex-1 flex items-center justify-center gap-1 py-1 rounded-md bg-muted hover:bg-muted/80 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Eye className="h-3 w-3" />
                        预览
                      </button>
                      <button
                        onClick={() => onAddToTodayMenu(recipe)}
                        className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-[11px] font-medium transition-all ${
                          inMenu
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : "bg-primary text-primary-foreground hover:bg-primary/90"
                        }`}
                      >
                        <Plus className="h-3 w-3" />
                        {inMenu ? "已加入" : "加入"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
