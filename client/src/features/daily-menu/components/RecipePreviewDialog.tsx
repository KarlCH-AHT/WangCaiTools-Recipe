import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Recipe } from "@/types/recipe";
import { useTranslation, useFormatUnit } from "@/hooks/useTranslation";
import { Clock, Users, ChefHat, UtensilsCrossed, Check, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

interface RecipePreviewDialogProps {
  recipe: Recipe | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Whether this recipe is already in today's menu */
  inMenu?: boolean;
  onAddToMenu?: () => void;
}

// ── View Detail Button ──────────────────────────────────────────────────────
function ViewDetailButton({ recipeId, onClose }: { recipeId: string; onClose: () => void }) {
  const [, navigate] = useLocation();
  return (
    <button
      onClick={() => {
        onClose();
        navigate(`/recipe/${recipeId}`);
      }}
      className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      查看完整菜谱
      <ArrowRight className="w-3.5 h-3.5" />
    </button>
  );
}

export default function RecipePreviewDialog({
  recipe,
  open,
  onOpenChange,
  inMenu = false,
  onAddToMenu,
}: RecipePreviewDialogProps) {
  const t = useTranslation();
  const fu = useFormatUnit();
  const formatIngredientMeta = (ingredient: { amount: number; unit: string }) => {
    const unit = ingredient.unit ?? "";
    const hasMeaningfulAmount = Number.isFinite(ingredient.amount) && ingredient.amount > 0;
    const isRaw = unit === "__raw__" || unit.trim() === "";
    if (!hasMeaningfulAmount || isRaw) return "";
    const amountText = ingredient.amount % 1 === 0 ? String(ingredient.amount) : ingredient.amount.toFixed(1);
    const unitText = fu(unit);
    return unitText ? `${amountText} ${unitText}` : amountText;
  };

  if (!recipe) return null;

  // Prefer first image from images array, fall back to imageUrl
  const heroImage =
    recipe.images && recipe.images.length > 0
      ? recipe.images[0]
      : recipe.imageUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl gap-0">
        {/* ── Hero image ── */}
        {heroImage ? (
          <div className="w-full h-52 overflow-hidden bg-muted flex-shrink-0">
            <img
              src={heroImage}
              alt={recipe.title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-full h-40 bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center flex-shrink-0">
            <span className="text-5xl">🍽️</span>
          </div>
        )}

        {/* ── Content ── */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Title + category */}
          <div>
            <h2
              className="text-lg font-bold text-foreground leading-snug"
              style={{ letterSpacing: "-0.02em" }}
            >
              {recipe.title}
            </h2>
            {recipe.category && (
              <span className="inline-flex items-center mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent text-accent-foreground">
                {recipe.category}
              </span>
            )}
          </div>

          {/* Description */}
          {recipe.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {recipe.description}
            </p>
          )}

          {/* Info pills */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            {recipe.servings && (
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {recipe.servings} {t("servings") || "人份"}
              </span>
            )}
            {recipe.prepTime && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {t("prepTime") || "备料"} {recipe.prepTime}{t("min") || "分钟"}
              </span>
            )}
            {recipe.cookTime && (
              <span className="flex items-center gap-1">
                <ChefHat className="w-3.5 h-3.5" />
                {t("cookTime") || "烹饪"} {recipe.cookTime}{t("min") || "分钟"}
              </span>
            )}
          </div>

          {/* Ingredients */}
          {recipe.ingredients && recipe.ingredients.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2.5">
                {t("ingredients") || "食材"}
              </h3>
              <ul className="space-y-1.5">
                {recipe.ingredients.map((ingredient) => (
                  <li
                    key={ingredient.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-foreground">{ingredient.name}</span>
                    {formatIngredientMeta(ingredient) ? (
                      <span className="text-muted-foreground text-xs">
                        {formatIngredientMeta(ingredient)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tags */}
          {recipe.tags && recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {recipe.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── CTA ── */}
        <div className="px-5 pb-5 pt-0 flex-shrink-0 space-y-2">
          {onAddToMenu && (
            <button
              onClick={() => {
                onAddToMenu();
                onOpenChange(false);
              }}
              className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                inMenu
                  ? "bg-primary/10 text-primary border border-primary/30 hover:bg-primary/15"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.99]"
              }`}
            >
              {inMenu ? (
                <>
                  <Check className="w-4 h-4" />
                  {t("alreadyInMenu") || "已加入今日食谱"}
                </>
              ) : (
                <>
                  <UtensilsCrossed className="w-4 h-4" />
                  {t("addToMenu") || "加入今日食谱"}
                </>
              )}
            </button>
          )}
          <ViewDetailButton recipeId={recipe.id} onClose={() => onOpenChange(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
