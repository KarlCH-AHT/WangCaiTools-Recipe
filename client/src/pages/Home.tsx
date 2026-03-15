import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Plus, Clock, Users, Search, X, Heart, Grid3x3, List, Grid2x2, Sparkles, UtensilsCrossed, Upload, ChevronDown, Check, Moon, Sun } from "lucide-react";
import { useRecipes } from "@/contexts/RecipeContext";
import { useTranslation } from "@/hooks/useTranslation";
import AddRecipeDialog from "@/components/AddRecipeDialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { languages } from "@/lib/i18n";
import ImportRecipeDialog from "@/components/ImportRecipeDialog";
import AIGenerateRecipeDialog from "@/components/AIGenerateRecipeDialog";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useTheme } from "@/contexts/ThemeContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ViewMode = "grid" | "thumbnail" | "list";
type SortType = "date" | "name" | "rating";

// ── Language label map ─────────────────────────────────────────────────────
const LANG_LABELS: Record<string, string> = { zh: "中", en: "En", de: "De" };

// ── Placeholder for recipes without image ──────────────────────────────────
function ImagePlaceholder({ title }: { title: string }) {
  const emoji = useMemo(() => {
    const emojis = ["🍜", "🥘", "🍲", "🥗", "🍱", "🍛", "🥩", "🍝", "🥞", "🍰"];
    return emojis[title.charCodeAt(0) % emojis.length];
  }, [title]);
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 gap-2">
      <span className="text-4xl">{emoji}</span>
    </div>
  );
}

// ── Favorite button ────────────────────────────────────────────────────────
function FavoriteBtn({ isFavorite, onToggle }: { isFavorite: boolean; onToggle: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center justify-center w-8 h-8 rounded-full bg-white/70 backdrop-blur-sm border border-black/5 transition-all hover:bg-white/85 active:scale-95"
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart className={`w-4 h-4 transition-colors ${isFavorite ? "fill-red-400/80 text-red-400/80" : "text-gray-400/80"}`} />
    </button>
  );
}

// ── Grid card ─────────────────────────────────────────────────────────────
function GridCard({ recipe, onNavigate, onToggleFavorite }: { recipe: any; onNavigate: () => void; onToggleFavorite: () => void }) {
  const firstImg = recipe.images?.length > 0 ? recipe.images[0] : recipe.imageUrl;
  const t = useTranslation();
  return (
    <div className="recipe-card group" onClick={onNavigate}>
      <div className="relative w-full aspect-[4/3] overflow-hidden bg-muted">
        {firstImg ? (
          <img src={firstImg} alt={recipe.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <ImagePlaceholder title={recipe.title} />
        )}
        {/* Hover overlay with quick actions – desktop only */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all duration-250 hidden lg:flex items-end justify-center pb-3 gap-2 opacity-0 group-hover:opacity-100">
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate(); }}
            className="flex items-center gap-1 px-3 py-1.5 bg-white/95 text-foreground rounded-lg text-xs font-medium shadow-md hover:bg-white transition-colors"
          >
            <span>查看</span>
          </button>
        </div>
        <div className="absolute top-2.5 right-2.5">
          <FavoriteBtn isFavorite={recipe.isFavorite} onToggle={(e) => { e.stopPropagation(); onToggleFavorite(); }} />
        </div>
        {recipe.category && (
          <div className="absolute bottom-2.5 left-2.5">
            <span className="chip bg-black/40 text-white backdrop-blur-sm text-[10px] px-2 py-0.5">{recipe.category}</span>
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-sm leading-snug line-clamp-2 text-foreground mb-1" style={{ letterSpacing: "-0.01em" }}>
          {recipe.title}
        </h3>
        {recipe.tags?.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1">
            {recipe.tags.slice(0, 3).map((tag: string, idx: number) => (
              <span
                key={tag}
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  idx % 4 === 0
                    ? "border border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-300"
                    : idx % 4 === 1
                      ? "border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300"
                      : idx % 4 === 2
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {recipe.servings && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{recipe.servings}</span>}
          {recipe.cookTime && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{recipe.cookTime}{t("min")}</span>}
        </div>
      </div>
    </div>
  );
}

// ── Thumbnail card ─────────────────────────────────────────────────────────
function ThumbnailCard({ recipe, onNavigate, onToggleFavorite }: { recipe: any; onNavigate: () => void; onToggleFavorite: () => void }) {
  const firstImg = recipe.images?.length > 0 ? recipe.images[0] : recipe.imageUrl;
  return (
    <div className="recipe-card group" onClick={onNavigate}>
      <div className="relative w-full aspect-square overflow-hidden bg-muted">
        {firstImg ? (
          <img src={firstImg} alt={recipe.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-103" />
        ) : (
          <ImagePlaceholder title={recipe.title} />
        )}
        <div className="absolute top-1.5 right-1.5">
          <FavoriteBtn isFavorite={recipe.isFavorite} onToggle={(e) => { e.stopPropagation(); onToggleFavorite(); }} />
        </div>
      </div>
      <div className="p-2.5">
        <h3 className="text-xs font-semibold line-clamp-2 leading-snug text-foreground">{recipe.title}</h3>
      </div>
    </div>
  );
}

// ── List row ───────────────────────────────────────────────────────────────
function ListRow({ recipe, onNavigate, onToggleFavorite }: { recipe: any; onNavigate: () => void; onToggleFavorite: () => void }) {
  const firstImg = recipe.images?.length > 0 ? recipe.images[0] : recipe.imageUrl;
  const t = useTranslation();
  return (
    <div
      className="flex items-center gap-3 p-3 bg-card rounded-xl cursor-pointer transition-all duration-150 hover:shadow-sm active:scale-[0.99]"
      style={{ boxShadow: "0 1px 3px oklch(0 0 0 / 0.05)" }}
      onClick={onNavigate}
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
        {recipe.tags?.length > 0 && (
          <div className="mt-0.5 flex flex-wrap gap-1">
            {recipe.tags.slice(0, 3).map((tag: string, idx: number) => (
              <span
                key={tag}
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  idx % 4 === 0
                    ? "border border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-300"
                    : idx % 4 === 1
                      ? "border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300"
                      : idx % 4 === 2
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2.5 mt-1 text-xs text-muted-foreground">
          {recipe.servings && <span className="flex items-center gap-0.5"><Users className="w-3 h-3" />{recipe.servings}</span>}
          {recipe.cookTime && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{recipe.cookTime}{t("min")}</span>}
          {recipe.category && <span className="chip-default text-[10px] px-2 py-0.5">{recipe.category}</span>}
        </div>
      </div>
      <FavoriteBtn isFavorite={recipe.isFavorite} onToggle={(e) => { e.stopPropagation(); onToggleFavorite(); }} />
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────
function EmptyState({ onAdd, t }: { onAdd: () => void; t: (k: string) => string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center mb-5 shadow-sm">
        <span className="text-4xl">🍽️</span>
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1.5">{t("noRecipes")}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs leading-relaxed">
        还没有菜谱，点击下方按钮添加你的第一道菜吧
      </p>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium transition-all hover:bg-primary/90 active:scale-95"
      >
        <Plus className="w-4 h-4" />
        {t("newRecipe")}
      </button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function Home() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading, logout } = useAuth();
  const { recipes, searchRecipes, toggleFavorite, loading: recipesLoading } = useRecipes();
  const { language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortType, setSortType] = useState<SortType>("date");
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem("home-view-mode") as ViewMode) || "grid";
  });

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem("home-view-mode", mode);
  }, []);

  const t = useTranslation();
  const handleLogout = useCallback(async () => {
    await logout();
    window.location.href = getLoginUrl();
  }, [logout]);

  const categories = useMemo(
    () => Array.from(new Set(recipes.map((r) => r.category).filter((c): c is string => Boolean(c)))),
    [recipes]
  );

  // All unique tags across all recipes
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    recipes.forEach((r) => (r.tags || []).forEach((tag) => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [recipes]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const displayRecipes = useMemo(() => {
    let result = searchQuery ? searchRecipes(searchQuery) : [...recipes];
    if (selectedCategory) result = result.filter((r) => r.category === selectedCategory);
    if (showFavoritesOnly) result = result.filter((r) => r.isFavorite);
    if (selectedTags.length > 0) result = result.filter((r) => selectedTags.every((tag) => (r.tags || []).includes(tag)));
    if (sortType === "name") result = result.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortType === "rating") result = result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    else result = result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return result;
  }, [recipes, searchQuery, selectedCategory, showFavoritesOnly, selectedTags, sortType, searchRecipes]);

  // Active filter label for category dropdown
  const categoryLabel = showFavoritesOnly
    ? "❤️ 收藏"
    : selectedCategory
    ? selectedCategory
    : t("all") || "全部";

  // Login prompt
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center mx-auto mb-6 shadow-sm">
            <span className="text-4xl">🍳</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{t("appTitle")}</h1>
          <p className="text-muted-foreground mb-8 text-sm">{t("yourRecipes")}</p>
          <button
            onClick={() => (window.location.href = getLoginUrl())}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium text-sm transition-all hover:bg-primary/90 active:scale-95"
          >
            {t("login") || "Login"}
          </button>
        </div>
      </div>
    );
  }

  if (authLoading || recipesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">加载中…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top Header ── */}
      <header className="bg-background/80 backdrop-blur-md sticky top-0 z-50 border-b border-border/50">
        <div className="container py-3">
          <div className="flex items-center justify-between gap-3">
            {/* Title */}
            <div className="min-w-0 flex-shrink">
              <h1 className="text-base font-bold text-foreground leading-tight truncate" style={{ letterSpacing: "-0.02em" }}>
                {t("appTitle")}
              </h1>
              <p className="text-[11px] text-muted-foreground hidden sm:block">{t("yourRecipes")}</p>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 px-2.5 py-2 bg-card border border-border rounded-xl text-xs font-medium text-foreground hover:bg-muted/50 transition-colors">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-[11px] font-semibold">
                        {(user.name || user.email || "?").slice(0, 1).toUpperCase()}
                      </span>
                      <span className="max-w-[120px] truncate">{user.name || user.email}</span>
                      <ChevronDown className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 rounded-xl">
                    <div className="px-3 py-2">
                      <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/change-password")} className="text-sm rounded-lg">
                      {t("changePassword") || "Change password"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-sm rounded-lg">
                      {t("logout") || "Sign out"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* MenuOverview – prominent standalone button */}
              <button
                onClick={() => navigate("/menu")}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-semibold transition-all hover:bg-amber-100 active:scale-95"
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t("menuOverview") || "菜单概览"}</span>
                <span className="sm:hidden">菜单</span>
              </button>

              {/* Add recipe dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold transition-all hover:bg-primary/90 active:scale-95">
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t("newRecipe")}</span>
                    <span className="sm:hidden">新建</span>
                    <ChevronDown className="w-3 h-3 opacity-70" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 rounded-xl">
                  <DropdownMenuItem onClick={() => setShowAddDialog(true)} className="gap-2 text-sm rounded-lg">
                    <Plus className="w-4 h-4 text-muted-foreground" />
                    {t("newRecipe") || "新建菜谱"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowAIDialog(true)} className="gap-2 text-sm rounded-lg">
                    <Sparkles className="w-4 h-4 text-primary" />
                    {t("generateWithAI") || "AI 生成"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowImportDialog(true)} className="gap-2 text-sm rounded-lg">
                    <Upload className="w-4 h-4 text-muted-foreground" />
                    {t("importRecipe") || "导入菜谱"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Language switcher – compact icon dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted text-xs font-semibold text-muted-foreground hover:bg-muted/80 transition-colors">
                    {LANG_LABELS[language] || language.slice(0, 2)}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-28 rounded-xl">
                  {languages.map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      onClick={() => setLanguage(lang.code as any)}
                      className="gap-2 text-sm rounded-lg justify-between"
                    >
                      <span>{lang.name}</span>
                      {language === lang.code && <Check className="w-3.5 h-3.5 text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* One-click dark mode */}
              <button
                onClick={() => toggleTheme?.()}
                className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                title={theme === "dark" ? "浅色模式" : "深色模式"}
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="container py-4 lg:py-3 space-y-3">

        {/* Search – centered on desktop */}
        <div className="relative lg:max-w-[720px] lg:mx-auto">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            className="search-input"
            placeholder={t("searchRecipes") || "搜索菜名、食材、标签…"}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 icon-btn w-6 h-6">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter row: category dropdown + sort + view toggle */}
        <div className="flex items-center gap-2">
          {/* Category / Favorites dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-lg text-xs font-medium text-foreground hover:bg-muted/50 transition-colors flex-shrink-0">
                {categoryLabel}
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44 rounded-xl">
              {/* All */}
              <DropdownMenuItem
                onClick={() => { setSelectedCategory(null); setShowFavoritesOnly(false); }}
                className="gap-2 text-sm rounded-lg justify-between"
              >
                <span>{t("all") || "全部"}</span>
                {!selectedCategory && !showFavoritesOnly && <Check className="w-3.5 h-3.5 text-primary" />}
              </DropdownMenuItem>
              {/* Categories */}
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
              {/* Favorites */}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => { setShowFavoritesOnly(!showFavoritesOnly); setSelectedCategory(null); }}
                className="gap-2 text-sm rounded-lg justify-between"
              >
                <span className="flex items-center gap-1.5"><Heart className="w-3.5 h-3.5 text-red-400" />收藏</span>
                {showFavoritesOnly && <Check className="w-3.5 h-3.5 text-primary" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 px-2.5 py-1.5 bg-card border border-border rounded-lg text-xs text-muted-foreground hover:bg-muted/50 transition-colors flex-shrink-0">
                <span>{sortType === "date" ? t("sortByDate") || "按日期" : sortType === "name" ? t("sortByName") || "按名称" : "按评分"}</span>
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
              <DropdownMenuItem onClick={() => setSortType("rating")} className="text-sm rounded-lg justify-between">
                <span>按评分</span>
                {sortType === "rating" && <Check className="w-3.5 h-3.5 text-primary" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Spacer */}
          <div className="flex-1" />

          {/* View mode toggle */}
          <div className="flex items-center bg-muted rounded-lg p-0.5 gap-0.5 flex-shrink-0">
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

        {/* Tag multi-select row – only show if there are tags */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
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
                清除
              </button>
            )}
          </div>
        )}

        {/* Recipe count */}
        {displayRecipes.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {displayRecipes.length} 道菜谱
            {searchQuery && ` · 搜索 "${searchQuery}"`}
          </p>
        )}

        {/* Recipe list */}
        {displayRecipes.length === 0 ? (
          <EmptyState onAdd={() => setShowAddDialog(true)} t={t} />
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
            {displayRecipes.map((recipe) => (
              <GridCard
                key={recipe.id}
                recipe={recipe}
                onNavigate={() => navigate(`/recipe/${recipe.id}`)}
                onToggleFavorite={() => toggleFavorite(recipe.id)}
              />
            ))}
          </div>
        ) : viewMode === "thumbnail" ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {displayRecipes.map((recipe) => (
              <ThumbnailCard
                key={recipe.id}
                recipe={recipe}
                onNavigate={() => navigate(`/recipe/${recipe.id}`)}
                onToggleFavorite={() => toggleFavorite(recipe.id)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {displayRecipes.map((recipe) => (
              <ListRow
                key={recipe.id}
                recipe={recipe}
                onNavigate={() => navigate(`/recipe/${recipe.id}`)}
                onToggleFavorite={() => toggleFavorite(recipe.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Dialogs */}
      <AddRecipeDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
      <ImportRecipeDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onOpenAddDialog={() => { setShowImportDialog(false); setShowAddDialog(true); }}
      />
      <AIGenerateRecipeDialog
        open={showAIDialog}
        onOpenChange={setShowAIDialog}
        onGenerated={(recipe) => {
          sessionStorage.setItem("generatedRecipe", JSON.stringify(recipe));
          setShowAddDialog(true);
        }}
      />
    </div>
  );
}
