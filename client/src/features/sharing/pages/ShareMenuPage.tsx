import { useEffect, useMemo, useState } from "react";
import { useRoute } from "wouter";
import { useTranslation, useFormatUnit } from "@/hooks/useTranslation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, ClipboardList, ShoppingBasket, Users, ChefHat, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

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

type CollaborationState = {
  householdName: string;
  buyer: string;
  cook: string;
  dinnerTime: string;
  note: string;
  checkedIngredients: string[];
  readyRecipeIds: string[];
};

const DEFAULT_COLLABORATION_STATE: CollaborationState = {
  householdName: "",
  buyer: "",
  cook: "",
  dinnerTime: "",
  note: "",
  checkedIngredients: [],
  readyRecipeIds: [],
};

export default function ShareMenuPage() {
  const [, params] = useRoute("/share/:id");
  const t = useTranslation();
  const fu = useFormatUnit();
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState<string | null>(null);
  const [items, setItems] = useState<ShareItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [collaboration, setCollaboration] = useState<CollaborationState>(DEFAULT_COLLABORATION_STATE);
  const [hasLoadedRemoteState, setHasLoadedRemoteState] = useState(false);
  const shareId = params?.id;

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        setHasLoadedRemoteState(false);
        const res = await fetch(`/api/share-menu/${shareId}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "Share not found");
          return;
        }
        const data = await res.json();
        setTitle(data?.share?.title || t("menuOverview") || "菜单");
        setItems(Array.isArray(data?.items) ? data.items : []);
        setCollaboration({
          ...DEFAULT_COLLABORATION_STATE,
          ...(data?.share?.metadata ?? {}),
        });
        setHasLoadedRemoteState(true);
      } catch {
        setError(t("networkError") || "Network error, please try again");
      } finally {
        setLoading(false);
      }
    };

    if (shareId) run();
  }, [shareId, t]);

  useEffect(() => {
    if (!shareId || !hasLoadedRemoteState) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      fetch(`/api/share-menu/${shareId}/collaboration`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(collaboration),
        signal: controller.signal,
      }).catch(() => {
        // Keep the page usable even if collaboration sync fails.
      });
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [collaboration, hasLoadedRemoteState, shareId]);
  

  const totals = useMemo(() => {
    const totalCookTime = items.reduce((sum, item) => sum + (item.recipe.cookTime || 0), 0);
    const totalServings = items.reduce((sum, item) => sum + (item.servings || item.recipe.servings || 0), 0);
    return { totalCookTime, totalServings };
  }, [items]);

  const combinedIngredients = useMemo(() => {
    const map = new Map<string, { key: string; name: string; amount: number; unit: string }>();

    items.forEach((item) => {
      const baseServings = item.recipe.servings || 1;
      const scale = (item.servings || baseServings) / baseServings;

      (item.recipe.ingredients || []).forEach((ing) => {
        const unit = (ing.unit || "").trim();
        const amount = Number(ing.amount ?? 0);
        const isRaw = unit === "__raw__" || unit === "" || !Number.isFinite(amount) || amount <= 0;
        const key = isRaw ? `${ing.name}__raw` : `${ing.name}__${unit}`;

        const current = map.get(key);
        if (current) {
          current.amount += isRaw ? 0 : amount * scale;
          return;
        }

        map.set(key, {
          key,
          name: ing.name,
          amount: isRaw ? 0 : amount * scale,
          unit: isRaw ? "__raw__" : unit,
        });
      });
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  useEffect(() => {
    const validIngredientKeys = new Set(combinedIngredients.map((item) => item.key));
    const validRecipeIds = new Set(items.map((item) => item.recipe.id));

    setCollaboration((prev) => {
      const nextCheckedIngredients = prev.checkedIngredients.filter((key) => validIngredientKeys.has(key));
      const nextReadyRecipeIds = prev.readyRecipeIds.filter((id) => validRecipeIds.has(id));

      if (
        nextCheckedIngredients.length === prev.checkedIngredients.length &&
        nextReadyRecipeIds.length === prev.readyRecipeIds.length
      ) {
        return prev;
      }

      return {
        ...prev,
        checkedIngredients: nextCheckedIngredients,
        readyRecipeIds: nextReadyRecipeIds,
      };
    });
  }, [combinedIngredients, items]);

  const checkedIngredientSet = useMemo(() => new Set(collaboration.checkedIngredients), [collaboration.checkedIngredients]);
  const readyRecipeSet = useMemo(() => new Set(collaboration.readyRecipeIds), [collaboration.readyRecipeIds]);

  const checkedIngredientCount = checkedIngredientSet.size;
  const readyRecipeCount = readyRecipeSet.size;

  const toggleIngredient = (key: string) => {
    setCollaboration((prev) => {
      const next = new Set(prev.checkedIngredients);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { ...prev, checkedIngredients: Array.from(next) };
    });
  };

  const toggleRecipeReady = (recipeId: string) => {
    setCollaboration((prev) => {
      const next = new Set(prev.readyRecipeIds);
      if (next.has(recipeId)) next.delete(recipeId);
      else next.add(recipeId);
      return { ...prev, readyRecipeIds: Array.from(next) };
    });
  };

  const updateField = (field: keyof CollaborationState, value: string) => {
    setCollaboration((prev) => ({ ...prev, [field]: value }));
  };

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
    <div className="min-h-screen bg-[linear-gradient(180deg,_rgba(236,253,245,0.55),_rgba(255,255,255,1)_28%)] pb-10">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="container py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700/80">
            {t("familyCollaborationFocus") || "家庭协作"}
          </p>
          <h1 className="mt-1 text-lg font-bold text-foreground">{title}</h1>
          <p className="text-xs text-muted-foreground">
            {t("menuShareHint") || "Shared menu view"}
          </p>
        </div>
      </header>

      <main className="container py-4 space-y-4">
        <section className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-emerald-200/70 bg-white/90 px-4 py-3 shadow-sm">
            <p className="text-xs text-muted-foreground">{t("selectedCount") || "已选"}</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{items.length}</p>
          </div>
          <div className="rounded-2xl border border-emerald-200/70 bg-white/90 px-4 py-3 shadow-sm">
            <p className="text-xs text-muted-foreground">{t("shoppingList") || "购物清单"}</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{combinedIngredients.length}</p>
          </div>
          <div className="rounded-2xl border border-emerald-200/70 bg-white/90 px-4 py-3 shadow-sm">
            <p className="text-xs text-muted-foreground">{t("totalCookTime") || "总时长"}</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{totals.totalCookTime}</p>
          </div>
          <div className="rounded-2xl border border-emerald-200/70 bg-white/90 px-4 py-3 shadow-sm">
            <p className="text-xs text-muted-foreground">{t("totalServings") || "总份量"}</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{totals.totalServings}</p>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <Card className="border-emerald-200/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-emerald-700" />
                {t("familyCoordinationBoard") || "家庭协作面板"}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">{t("householdName") || "家庭名称"}</label>
                <Input
                  value={collaboration.householdName}
                  onChange={(e) => updateField("householdName", e.target.value)}
                  placeholder={t("householdNamePlaceholder") || "例如：周日晚餐小组"}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">{t("dinnerTime") || "开饭时间"}</label>
                <Input
                  value={collaboration.dinnerTime}
                  onChange={(e) => updateField("dinnerTime", e.target.value)}
                  placeholder={t("dinnerTimePlaceholder") || "例如：19:00"}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">{t("buyer") || "谁买菜"}</label>
                <Input
                  value={collaboration.buyer}
                  onChange={(e) => updateField("buyer", e.target.value)}
                  placeholder={t("buyerPlaceholder") || "例如：爸爸"}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">{t("cookOwner") || "谁做饭"}</label>
                <Input
                  value={collaboration.cook}
                  onChange={(e) => updateField("cook", e.target.value)}
                  placeholder={t("cookOwnerPlaceholder") || "例如：妈妈"}
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs text-muted-foreground">{t("familyNote") || "家庭备注"}</label>
                <Textarea
                  value={collaboration.note}
                  onChange={(e) => updateField("note", e.target.value)}
                  rows={4}
                  placeholder={t("familyNotePlaceholder") || "写下买菜提醒、忌口、谁晚点到家等信息"}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-200/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="h-4 w-4 text-emerald-700" />
                {t("todayStatusBoard") || "今日状态"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl bg-emerald-50 px-4 py-3">
                <p className="text-xs text-muted-foreground">{t("shoppingProgress") || "采购进度"}</p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {checkedIngredientCount}/{combinedIngredients.length}
                </p>
              </div>
              <div className="rounded-2xl bg-emerald-50 px-4 py-3">
                <p className="text-xs text-muted-foreground">{t("cookingProgress") || "备餐进度"}</p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {readyRecipeCount}/{items.length}
                </p>
              </div>
              <div className="rounded-2xl border border-dashed border-emerald-200 px-4 py-3 text-sm text-muted-foreground">
                {collaboration.householdName || t("householdSummaryFallback") || "这份共享菜单现在可以作为家庭协作页使用。"}
                {(collaboration.buyer || collaboration.cook) && (
                  <div className="mt-2 space-y-1 text-foreground">
                    {collaboration.buyer && <p>{t("buyer") || "谁买菜"}: {collaboration.buyer}</p>}
                    {collaboration.cook && <p>{t("cookOwner") || "谁做饭"}: {collaboration.cook}</p>}
                    {collaboration.dinnerTime && <p>{t("dinnerTime") || "开饭时间"}: {collaboration.dinnerTime}</p>}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Card className="border-emerald-200/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingBasket className="h-4 w-4 text-emerald-700" />
                {t("familyShoppingChecklist") || "家庭采购清单"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {combinedIngredients.map((ing) => {
                const checked = checkedIngredientSet.has(ing.key);
                const amountText =
                  ing.unit === "__raw__" || !Number.isFinite(ing.amount) || ing.amount <= 0
                    ? ing.name
                    : `${ing.amount % 1 === 0 ? ing.amount : ing.amount.toFixed(1)} ${fu(ing.unit)} ${ing.name}`;

                return (
                  <button
                    key={ing.key}
                    onClick={() => toggleIngredient(ing.key)}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-colors ${
                      checked ? "border-emerald-300 bg-emerald-50 text-muted-foreground" : "border-border bg-background hover:bg-muted/40"
                    }`}
                  >
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${checked ? "border-emerald-600 bg-emerald-600 text-white" : "border-border"}`}>
                      {checked && <Check className="h-3 w-3" />}
                    </span>
                    <span className={`text-sm ${checked ? "line-through" : "text-foreground"}`}>{amountText}</span>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <div className="space-y-4">
            {items.map((item) => {
              const recipe = item.recipe;
              const img = recipe.images?.[0] || recipe.imageUrl;
              const ready = readyRecipeSet.has(recipe.id);
              return (
                <Card key={recipe.id} className="overflow-hidden border-emerald-200/70">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">{recipe.title}</CardTitle>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t("servings") || "份量"}: {item.servings || recipe.servings || 0}
                          {recipe.cookTime ? ` · ${recipe.cookTime}${t("min") || "分钟"}` : ""}
                        </p>
                      </div>
                      <Button
                        variant={ready ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleRecipeReady(recipe.id)}
                        className={ready ? "bg-emerald-600 hover:bg-emerald-500" : ""}
                      >
                        {ready ? t("ready") || "已就绪" : t("markReady") || "标记就绪"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {img && (
                      <img src={img} alt={recipe.title} className="w-full max-h-56 object-cover rounded-lg" />
                    )}
                    {recipe.description && <p className="text-sm text-muted-foreground">{recipe.description}</p>}

                    <div className="grid gap-2 sm:grid-cols-3">
                      <div className="rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
                        <ChefHat className="mb-1 h-3.5 w-3.5 text-foreground" />
                        {t("servings") || "份量"} {item.servings || recipe.servings || 0}
                      </div>
                      <div className="rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
                        <Clock className="mb-1 h-3.5 w-3.5 text-foreground" />
                        {t("cookTime") || "烹饪"} {recipe.cookTime || 0}{t("min") || "分钟"}
                      </div>
                      <div className="rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
                        <Users className="mb-1 h-3.5 w-3.5 text-foreground" />
                        {ready ? (t("ready") || "已就绪") : (t("pending") || "待处理")}
                      </div>
                    </div>

                    {recipe.steps && recipe.steps.length > 0 && (
                      <div>
                        <h3 className="mb-2 text-sm font-semibold">{t("steps") || "步骤"}</h3>
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
          </div>
        </section>
      </main>
    </div>
  );
}
