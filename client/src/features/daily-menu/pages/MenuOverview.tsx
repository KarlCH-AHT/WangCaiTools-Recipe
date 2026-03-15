import { useState, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Clock, Users, Plus, Grid3x3, List, Grid2x2,
  Heart, Check, UtensilsCrossed, ChevronDown, X, Eye, Share2, CalendarDays,
} from "lucide-react";
import { useRecipes } from "@/features/recipes";
import { PortionSelectionDialog, RandomRecommendation, RecipePreviewDialog, useDailyMenu } from "@/features/daily-menu";
import { useTranslation } from "@/hooks/useTranslation";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Menu Overview Page – pick recipes to add to today's menu
 * - Category dropdown + sort dropdown + tag multi-select
 * - Each card has Preview button (shows image/description/ingredients)
 *   and Add-to-Menu button
 */

type ViewMode = "grid" | "thumbnail" | "list";
type SortType = "date" | "name";

// ── Image placeholder ──────────────────────────────────────────────────────
function ImagePlaceholder({ title }: { title: string }) {
  const emojis = ["🍜", "🥘", "🍲", "🥗", "🍱", "🍛", "🥩", "🍝", "🥞", "🍰"];
  const emoji = emojis[title.charCodeAt(0) % emojis.length];
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 gap-1">
      <span className="text-3xl">{emoji}</span>
    </div>
  );
}

export default function MenuOverview() {
  const [, navigate] = useLocation();
  const { recipes, toggleFavorite } = useRecipes();
  const { dailyMenu, addMenuItem, removeMenuItem } = useDailyMenu();
  const t = useTranslation();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortType, setSortType] = useState<SortType>("date");
  const [showPortionDialog, setShowPortionDialog] = useState(false);
  const [selectedRecipeForPortion, setSelectedRecipeForPortion] = useState<any>(null);
  const [previewRecipe, setPreviewRecipe] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem("menu-view-mode") as ViewMode) || "grid";
  });

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem("menu-view-mode", mode);
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(recipes.map((r) => r.category).filter((c): c is string => Boolean(c)))),
    [recipes]
  );

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    recipes.forEach((r) => (r.tags || []).forEach((tag: string) => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [recipes]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const displayRecipes = useMemo(() => {
    let result = [...recipes];
    if (selectedCategory) result = result.filter((r) => r.category === selectedCategory);
    if (showFavoritesOnly) result = result.filter((r) => r.isFavorite);
    if (selectedTags.length > 0)
      result = result.filter((r) => selectedTags.every((tag) => (r.tags || []).includes(tag)));
    if (sortType === "name") result = result.sort((a, b) => a.title.localeCompare(b.title));
    else result = result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return result;
  }, [recipes, selectedCategory, showFavoritesOnly, selectedTags, sortType]);

  const isInMenu = (recipeId: string) => dailyMenu.items.some((item) => item.recipeId === recipeId);
  const menuRecipes = useMemo(
    () =>
      dailyMenu.items
        .map((item) => {
          const recipe = recipes.find((r) => r.id === item.recipeId);
          if (!recipe) return null;
          return { recipe, servings: item.servings };
        })
        .filter(Boolean) as { recipe: any; servings: number }[],
    [dailyMenu.items, recipes]
  );
  const totalCookTime = useMemo(
    () => menuRecipes.reduce((sum, item) => sum + (item.recipe.cookTime || 0), 0),
    [menuRecipes]
  );
  const totalServings = useMemo(
    () => menuRecipes.reduce((sum, item) => sum + (item.servings || item.recipe.servings || 0), 0),
    [menuRecipes]
  );

  const handleAddToMenu = (recipe: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedRecipeForPortion(recipe);
    setShowPortionDialog(true);
  };

  const handlePortionConfirm = (servings: number) => {
    if (selectedRecipeForPortion) {
      addMenuItem(selectedRecipeForPortion.id, servings);
      setShowPortionDialog(false);
      setSelectedRecipeForPortion(null);
    }
  };

  const openPreview = (recipe: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPreviewRecipe(recipe);
    setShowPreview(true);
  };

  const handleShareMenu = async () => {
    try {
      const dateLabel = new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
      }).format(new Date());
      const res = await fetch("/api/share-menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: `${dateLabel} ${t("familySharedMenuTitle") || "家庭菜单"}`,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || t("shareFailed") || "Share failed");
        return;
      }
      const data = await res.json();
      const url = `${window.location.origin}/share/${data.id}`;
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        toast.success(t("shareLinkCopied") || "Link copied");
      } else {
        toast.message(t("shareLinkPrompt") || "Copy this link", {
          description: url,
        });
      }
    } catch {
      toast.error(t("shareFailed") || "Share failed");
    }
  };

  const categoryLabel = showFavoritesOnly
    ? t("favorites") || "收藏"
    : selectedCategory
    ? selectedCategory
    : t("all") || "全部";

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50/60 via-background to-background pb-10 dark:from-cyan-950/20">
      {/* ── Header ── */}
      <header className="bg-background/80 backdrop-blur-md sticky top-0 z-50 border-b border-border/50">
        <div className="container py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate("/")} className="icon-btn">
                <ArrowLeft className="w-4.5 h-4.5" />
              </button>
              <div>
                <h1 className="text-base font-bold text-foreground leading-tight" style={{ letterSpacing: "-0.02em" }}>
                  {t("menuOverview")}
                </h1>
                <p className="text-xs text-muted-foreground">{t("menuOverviewDesc") || "从菜谱库挑选候选菜，再进入今日菜单或周计划。"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/weekly")}
                className="flex items-center justify-center w-8 h-8 rounded-xl border border-border bg-card text-muted-foreground hover:bg-muted/60 transition-colors"
                aria-label={t("weeklyMenu") || "Weekly menu"}
                title={t("weeklyMenu") || "Weekly menu"}
              >
                <CalendarDays className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleShareMenu}
                className="flex items-center justify-center w-8 h-8 rounded-xl border border-border bg-card text-muted-foreground hover:bg-muted/60 transition-colors"
                aria-label={t("shareMenu") || "Share menu"}
                title={t("shareMenu") || "Share menu"}
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => navigate("/today")}
                className="flex items-center gap-2 px-3.5 py-2 bg-cyan-600 text-white rounded-xl text-xs font-semibold transition-all hover:bg-cyan-500 active:scale-95"
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>{t("startCooking") || "开始烹饪"}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-4 space-y-4">
        <section className="rounded-2xl border border-cyan-200/70 bg-white/85 p-4 shadow-sm dark:border-cyan-900/60 dark:bg-zinc-900/70">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">{t("menuWorkbench") || "今日菜单工作台"}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{t("menuWorkbenchDesc") || "计划导向视图，区别于首页菜谱收藏浏览"}</p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded-full bg-cyan-100 px-2.5 py-1 font-medium text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300">
                {t("selectedCount") || "已选"} {menuRecipes.length}
              </span>
              <span className="rounded-full bg-cyan-100 px-2.5 py-1 font-medium text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300">
                {t("totalCookTime") || "约时长"} {totalCookTime} {t("min") || "分钟"}
              </span>
              <span className="rounded-full bg-cyan-100 px-2.5 py-1 font-medium text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300">
                {t("totalServings") || "总份量"} {totalServings || 0}
              </span>
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-3">
            <RandomRecommendation
              recipes={recipes}
              onAddToTodayMenu={(recipe) => handleAddToMenu(recipe)}
              onPreviewRecipe={(recipe) => openPreview(recipe)}
              isInTodayMenu={isInMenu}
            />

            {/* ── Filter row ── */}
            <div className="flex flex-wrap items-center gap-2">
          {/* Category / Favorites dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-lg text-xs font-medium text-foreground hover:bg-muted/50 transition-colors flex-shrink-0">
                {categoryLabel}
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44 rounded-xl">
              <DropdownMenuItem
                onClick={() => { setSelectedCategory(null); setShowFavoritesOnly(false); }}
                className="gap-2 text-sm rounded-lg justify-between"
              >
                <span>{t("all") || "全部"}</span>
                {!selectedCategory && !showFavoritesOnly && <Check className="w-3.5 h-3.5 text-primary" />}
              </DropdownMenuItem>
              {categories.length > 0 && <DropdownMenuSeparator />}
              {categories.map((cat) => (
                <DropdownMenuItem
                  key={cat}
                  onClick={() => { setSelectedCategory(selectedCategory === cat ? null : cat); setShowFavoritesOnly(false); }}
                  className="gap-2 text-sm rounded-lg justify-between"
                >
                  <span>{cat}</span>
                  {selectedCategory === cat && <Check className="w-3.5 h-3.5 text-primary" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => { setShowFavoritesOnly(!showFavoritesOnly); setSelectedCategory(null); }}
                className="gap-2 text-sm rounded-lg justify-between"
              >
                <span className="flex items-center gap-1.5"><Heart className="w-3.5 h-3.5 text-red-400" />{t("favorites") || "收藏"}</span>
                {showFavoritesOnly && <Check className="w-3.5 h-3.5 text-primary" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 px-2.5 py-1.5 bg-card border border-border rounded-lg text-xs text-muted-foreground hover:bg-muted/50 transition-colors flex-shrink-0">
                <span>{sortType === "date" ? t("sortByDate") || "按日期" : t("sortByName") || "按名称"}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-32 rounded-xl">
              <DropdownMenuItem onClick={() => setSortType("date")} className="text-sm rounded-lg justify-between">
                <span>{t("sortByDate") || "按日期"}</span>
                {sortType === "date" && <Check className="w-3.5 h-3.5 text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortType("name")} className="text-sm rounded-lg justify-between">
                <span>{t("sortByName") || "按名称"}</span>
                {sortType === "name" && <Check className="w-3.5 h-3.5 text-primary" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View mode toggle */}
          <div className="ml-auto flex items-center bg-muted rounded-lg p-0.5 gap-0.5 flex-shrink-0">
            {([["grid", Grid3x3], ["thumbnail", Grid2x2], ["list", List]] as [ViewMode, any][]).map(([mode, Icon]) => (
              <button
                key={mode}
                onClick={() => handleViewModeChange(mode)}
                className={`flex items-center justify-center w-7 h-7 rounded-md transition-all ${
                  viewMode === mode ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
            </div>

        {/* ── Tag multi-select row ── */}
            {allTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pb-0.5">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                  selectedTags.includes(tag)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
              >
                {tag}
              </button>
            ))}
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-full text-[11px] text-muted-foreground hover:text-foreground border border-transparent hover:border-border transition-all"
              >
                <X className="w-3 h-3" />
                {t("clear") || "清除"}
              </button>
            )}
              </div>
            )}

        {/* Recipe count */}
            {displayRecipes.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {displayRecipes.length} {t("candidateRecipes") || "道候选菜谱"}
              </p>
            )}

        {/* ── Empty state ── */}
            {displayRecipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center mb-5 shadow-sm">
              <span className="text-4xl">🍽️</span>
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1.5">{t("noRecipes")}</h3>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              {selectedCategory ? `${t("noRecipesInCategory") || "分类"}「${selectedCategory}」${t("noRecipesSuffix") || "下暂无菜谱"}` : t("noRecipesDescShort") || "还没有菜谱"}
            </p>
          </div>
            ) : viewMode === "grid" ? (
          /* ── Grid view ── */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
            {displayRecipes.map((recipe) => {
              const firstImg = (recipe.images && recipe.images.length > 0) ? recipe.images[0] : recipe.imageUrl;
              const inMenu = isInMenu(recipe.id);
              return (
                <div key={recipe.id} className="recipe-card group overflow-hidden">
                  {/* Image area – click to preview */}
                  <div
                    className="relative w-full aspect-[4/3] overflow-hidden bg-muted cursor-pointer"
                    onClick={() => openPreview(recipe)}
                  >
                    {firstImg ? (
                      <img src={firstImg} alt={recipe.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <ImagePlaceholder title={recipe.title} />
                    )}
                    {/* Favorite */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(recipe.id); }}
                      className="absolute top-2.5 left-2.5 flex items-center justify-center w-8 h-8 rounded-full bg-white/70 backdrop-blur-sm border border-black/5 transition-all hover:bg-white/85 active:scale-95"
                    >
                      <Heart className={`w-4 h-4 ${recipe.isFavorite ? "fill-red-400/80 text-red-400/80" : "text-gray-400/80"}`} />
                    </button>
                    {recipe.category && (
                      <div className="absolute bottom-2.5 left-2.5">
                        <span className="chip bg-black/40 text-white backdrop-blur-sm text-[10px] px-2 py-0.5">{recipe.category}</span>
                      </div>
                    )}
                  </div>
                  {/* Card body */}
                  <div className="p-3">
                    <h3 className="font-semibold text-sm leading-snug line-clamp-2 text-foreground mb-1" style={{ letterSpacing: "-0.01em" }}>
                      {recipe.title}
                    </h3>
                    <div className="flex items-center gap-2.5 text-xs text-muted-foreground mb-2.5">
                      {recipe.servings && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{recipe.servings}</span>}
                      {recipe.cookTime && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{recipe.cookTime}{t("min")}</span>}
                    </div>
                    {/* Action row */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openPreview(recipe)}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        {t("preview") || "预览"}
                      </button>
                      <button
                        onClick={(e) => handleAddToMenu(recipe, e)}
                        className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          inMenu
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : "bg-primary text-primary-foreground hover:bg-primary/90"
                        }`}
                      >
                        {inMenu ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                        {inMenu ? t("added") || "已加入" : t("addToMenu") || "加入菜单"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
            ) : viewMode === "thumbnail" ? (
          /* ── Thumbnail view ── */
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {displayRecipes.map((recipe) => {
              const firstImg = (recipe.images && recipe.images.length > 0) ? recipe.images[0] : recipe.imageUrl;
              const inMenu = isInMenu(recipe.id);
              return (
                <div key={recipe.id} className="recipe-card group overflow-hidden cursor-pointer" onClick={() => openPreview(recipe)}>
                  <div className="relative w-full aspect-square overflow-hidden bg-muted">
                    {firstImg ? (
                      <img src={firstImg} alt={recipe.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <ImagePlaceholder title={recipe.title} />
                    )}
                    {/* Favorite */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(recipe.id); }}
                      className="absolute top-1.5 left-1.5 flex items-center justify-center w-7 h-7 rounded-full bg-white/70 backdrop-blur-sm border border-black/5 transition-all hover:bg-white/85 active:scale-95"
                    >
                      <Heart className={`w-3.5 h-3.5 ${recipe.isFavorite ? "fill-red-400/80 text-red-400/80" : "text-gray-400/80"}`} />
                    </button>
                    {/* Add to menu overlay button */}
                    <button
                      onClick={(e) => handleAddToMenu(recipe, e)}
                      className={`absolute top-1.5 right-1.5 flex items-center justify-center w-7 h-7 rounded-full shadow-sm transition-all hover:scale-110 active:scale-95 ${
                        inMenu ? "bg-primary text-primary-foreground" : "bg-white/90 backdrop-blur-sm text-primary"
                      }`}
                    >
                      {inMenu ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="p-2">
                    <h3 className="text-xs font-semibold line-clamp-2 leading-snug text-foreground">{recipe.title}</h3>
                  </div>
                </div>
              );
            })}
          </div>
            ) : (
          /* ── List view ── */
          <div className="space-y-2">
            {displayRecipes.map((recipe) => {
              const firstImg = (recipe.images && recipe.images.length > 0) ? recipe.images[0] : recipe.imageUrl;
              const inMenu = isInMenu(recipe.id);
              return (
                <div
                  key={recipe.id}
                  className="flex items-center gap-3 p-3 bg-card rounded-xl cursor-pointer transition-all duration-150 hover:shadow-sm active:scale-[0.99]"
                  style={{ boxShadow: "0 1px 3px oklch(0 0 0 / 0.05)" }}
                  onClick={() => openPreview(recipe)}
                >
                  <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                    {firstImg ? (
                      <img src={firstImg} alt={recipe.title} className="w-full h-full object-cover" />
                    ) : (
                      <ImagePlaceholder title={recipe.title} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate text-foreground" style={{ letterSpacing: "-0.01em" }}>{recipe.title}</h3>
                    {recipe.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{recipe.description}</p>}
                    <div className="flex items-center gap-2.5 mt-1 text-xs text-muted-foreground flex-wrap">
                      {recipe.servings && <span className="flex items-center gap-0.5"><Users className="w-3 h-3" />{recipe.servings}</span>}
                      {recipe.cookTime && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{recipe.cookTime}{t("min")}</span>}
                      {recipe.category && <span className="chip-default text-[10px] px-2 py-0.5">{recipe.category}</span>}
                      {(recipe.tags || []).slice(0, 2).map((tag: string) => (
                        <span key={tag} className="chip-default text-[10px] px-2 py-0.5">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(recipe.id); }}
                      className="flex items-center justify-center w-8 h-8 rounded-full bg-white/70 border border-black/5 transition-all hover:bg-white/85 active:scale-95"
                    >
                      <Heart className={`w-4 h-4 ${recipe.isFavorite ? "fill-red-400/80 text-red-400/80" : "text-gray-400/80"}`} />
                    </button>
                    <button
                      onClick={(e) => handleAddToMenu(recipe, e)}
                      className={`flex items-center justify-center w-8 h-8 rounded-full shadow-sm transition-all hover:scale-110 active:scale-95 ${
                        inMenu ? "bg-primary text-primary-foreground" : "bg-muted text-primary"
                      }`}
                    >
                      {inMenu ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
            )}
          </section>

          <aside className="lg:sticky lg:top-[88px] h-fit space-y-3">
            <div className="rounded-2xl border border-cyan-200/70 bg-white/90 p-3 dark:border-cyan-900/60 dark:bg-zinc-900/70">
              <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{t("selectedMenu") || "已选菜单"}</h3>
              <button onClick={() => navigate("/today")} className="text-xs text-cyan-700 hover:text-cyan-600">
                {t("open") || "打开"}
              </button>
            </div>
            <div className="mt-2 space-y-2 max-h-[280px] overflow-auto pr-1">
              {menuRecipes.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("noMenuYet") || "还没有加入菜谱"}</p>
              ) : (
                  menuRecipes.map(({ recipe, servings }) => (
                    <div key={recipe.id} className="rounded-xl border bg-cyan-50/40 p-2 dark:bg-zinc-800/70">
                      <p className="text-sm font-medium truncate">{recipe.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {servings} {t("servingsUnit") || "人份"} · {recipe.cookTime || 0} {t("min") || "分钟"}
                      </p>
                      <div className="mt-2 flex gap-1.5">
                        <button onClick={() => openPreview(recipe)} className="flex-1 rounded-lg border bg-white px-2 py-1 text-xs dark:bg-zinc-900/40">
                          {t("preview") || "预览"}
                        </button>
                        <button onClick={() => removeMenuItem(recipe.id)} className="rounded-lg border px-2 py-1 text-xs text-muted-foreground">
                          {t("remove") || "移除"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-cyan-200/70 bg-white/90 p-3 dark:border-cyan-900/60 dark:bg-zinc-900/70">
              <h3 className="text-sm font-semibold">{t("timeline") || "执行时间线"}</h3>
              <div className="mt-2 space-y-2">
                {menuRecipes.slice(0, 5).map(({ recipe }, idx) => (
                  <div key={recipe.id} className="flex items-start gap-2">
                    <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-cyan-600 text-[10px] font-semibold text-white">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">{recipe.title}</p>
                      <p className="text-[11px] text-muted-foreground">{recipe.cookTime || 0} 分钟</p>
                    </div>
                  </div>
                ))}
                {menuRecipes.length === 0 && (
                  <p className="text-xs text-muted-foreground">{t("timelineEmpty") || "加入菜谱后自动生成流程"}</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Dialogs */}
      <PortionSelectionDialog
        open={showPortionDialog}
        onOpenChange={setShowPortionDialog}
        recipeName={selectedRecipeForPortion?.title || ""}
        defaultServings={selectedRecipeForPortion?.servings || 2}
        onConfirm={handlePortionConfirm}
      />
      <RecipePreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        recipe={previewRecipe}
        inMenu={previewRecipe ? isInMenu(previewRecipe.id) : false}
        onAddToMenu={() => {
          if (previewRecipe) {
            handleAddToMenu(previewRecipe);
            setShowPreview(false);
          }
        }}
      />
    </div>
  );
}
