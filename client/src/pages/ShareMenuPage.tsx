import { useEffect, useMemo, useState } from "react";
import { useRoute } from "wouter";
import { useTranslation } from "@/hooks/useTranslation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ShareItem = {
  servings: number;
  recipe: {
    id: string;
    title: string;
    description?: string;
    cookTime?: number;
    servings?: number;
    imageUrl?: string;
    images?: string[];
    ingredients?: Array<{ id: string; name: string; amount: number; unit: string }>;
    steps?: Array<{ id: string; number: number; description: string }>;
  };
};

export default function ShareMenuPage() {
  const [, params] = useRoute("/share/:id");
  const t = useTranslation();
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState<string | null>(null);
  const [items, setItems] = useState<ShareItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/share-menu/${params?.id}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "Share not found");
          return;
        }
        const data = await res.json();
        setTitle(data?.share?.title || t("menuOverview") || "菜单");
        setItems(Array.isArray(data?.items) ? data.items : []);
      } catch {
        setError(t("networkError") || "Network error, please try again");
      } finally {
        setLoading(false);
      }
    };
    if (params?.id) run();
  }, [params?.id, t]);

  const totals = useMemo(() => {
    const totalCookTime = items.reduce((sum, item) => sum + (item.recipe.cookTime || 0), 0);
    const totalServings = items.reduce((sum, item) => sum + (item.servings || item.recipe.servings || 0), 0);
    return { totalCookTime, totalServings };
  }, [items]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">{t("loading") || "Loading..."}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="container py-3">
          <h1 className="text-base font-bold text-foreground">{title}</h1>
          <p className="text-xs text-muted-foreground">
            {t("menuShareHint") || "Shared menu view"}
          </p>
        </div>
      </header>

      <main className="container py-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">
            {t("selectedCount") || "已选"} {items.length}
          </span>
          <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">
            {t("totalCookTime") || "总时长"} {totals.totalCookTime}
          </span>
          <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">
            {t("totalServings") || "总份量"} {totals.totalServings}
          </span>
        </div>

        {items.map((item) => {
          const recipe = item.recipe;
          const img = recipe.images?.[0] || recipe.imageUrl;
          return (
            <Card key={recipe.id} className="overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base">{recipe.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {img && (
                  <img src={img} alt={recipe.title} className="w-full max-h-56 object-cover rounded-lg" />
                )}
                {recipe.description && <p className="text-sm text-muted-foreground">{recipe.description}</p>}
                <div className="text-xs text-muted-foreground">
                  {t("servings") || "份量"}: {item.servings || recipe.servings || 0}
                  {recipe.cookTime ? ` · ${t("cookTime") || "烹饪"} ${recipe.cookTime}${t("min") || "分钟"}` : ""}
                </div>

                {recipe.ingredients && recipe.ingredients.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">{t("ingredients") || "食材"}</h3>
                    <ul className="space-y-1 text-sm text-foreground">
                      {recipe.ingredients.map((ing) => (
                        <li key={ing.id} className="flex items-center gap-2">
                          <span className="text-muted-foreground">{ing.amount}</span>
                          <span className="text-muted-foreground">{ing.unit}</span>
                          <span>{ing.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {recipe.steps && recipe.steps.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">{t("steps") || "步骤"}</h3>
                    <ol className="space-y-2 text-sm text-foreground">
                      {recipe.steps
                        .slice()
                        .sort((a, b) => a.number - b.number)
                        .map((step) => (
                          <li key={step.id} className="flex items-start gap-2">
                            <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                              {step.number}
                            </span>
                            <span>{step.description}</span>
                          </li>
                        ))}
                    </ol>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </main>
    </div>
  );
}
