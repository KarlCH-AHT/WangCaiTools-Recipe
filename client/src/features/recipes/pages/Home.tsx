import { useState, useMemo, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import {
  Plus,
  Clock,
  Users,
  Search,
  X,
  Heart,
  Grid3x3,
  List,
  Grid2x2,
  Sparkles,
  UtensilsCrossed,
  Upload,
  ChevronDown,
  Check,
  Moon,
  Sun,
  CalendarDays,
  Share2,
  ArrowRight,
  FolderPlus,
  NotebookTabs,
  WandSparkles,
} from "lucide-react";
import { useRecipes } from "@/features/recipes";
import { useDailyMenu } from "@/features/daily-menu";
import { useWeeklyMenu } from "@/features/weekly-menu";
import { useTranslation } from "@/hooks/useTranslation";
import { AddRecipeDialog, AIGenerateRecipeDialog, ImportRecipeDialog } from "@/features/recipes";
import { useLanguage } from "@/contexts/LanguageContext";
import { languages } from "@/lib/i18n";
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
type HomeMode = "collect" | "plan";

const LANG_LABELS: Record<string, string> = { zh: "中", en: "En", de: "De" };
const DAY_LABELS: Record<string, string> = {
  monday: "周一",
  tuesday: "周二",
  wednesday: "周三",
  thursday: "周四",
  friday: "周五",
  saturday: "周六",
  sunday: "周日",
};

function ImagePlaceholder({ title }: { title: string }) {
  const emoji = useMemo(() => {
    const emojis = ["🍜", "🥘", "🍲", "🥗", "🍱", "🍛", "🥩", "🍝", "🥞", "🍰"];
    return emojis[title.charCodeAt(0) % emojis.length];
  }, [title]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-orange-50 to-amber-50">
      <span className="text-4xl">{emoji}</span>
    </div>
  );
}

function FavoriteBtn({
  isFavorite,
  onToggle,
}: {
  isFavorite: boolean;
  onToggle: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-black/5 bg-white/70 backdrop-blur-sm transition-all hover:bg-white/85 active:scale-95"
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart className={`h-4 w-4 transition-colors ${isFavorite ? "fill-red-400/80 text-red-400/80" : "text-gray-400/80"}`} />
    </button>
  );
}

function GridCard({
  recipe,
  onNavigate,
  onToggleFavorite,
}: {
  recipe: any;
  onNavigate: () => void;
  onToggleFavorite: () => void;
}) {
  const firstImg = recipe.images?.length > 0 ? recipe.images[0] : recipe.imageUrl;
  const t = useTranslation();

  return (
    <div className="recipe-card group" onClick={onNavigate}>
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {firstImg ? (
          <img src={firstImg} alt={recipe.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <ImagePlaceholder title={recipe.title} />
        )}
        <div className="absolute top-2.5 right-2.5">
          <FavoriteBtn isFavorite={recipe.isFavorite} onToggle={(e) => { e.stopPropagation(); onToggleFavorite(); }} />
        </div>
        {recipe.category && (
          <div className="absolute bottom-2.5 left-2.5">
            <span className="chip bg-black/40 px-2 py-0.5 text-[10px] text-white backdrop-blur-sm">{recipe.category}</span>
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="mb-1 text-sm font-semibold leading-snug text-foreground line-clamp-2" style={{ letterSpacing: "-0.01em" }}>
          {recipe.title}
        </h3>
        {recipe.tags?.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1">
            {recipe.tags.slice(0, 3).map((tag: string, idx: number) => (
              <span
                key={tag}
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  idx % 4 === 0
                    ? "border border-orange-200 bg-orange-50 text-orange-700"
                    : idx % 4 === 1
                      ? "border border-sky-200 bg-sky-50 text-sky-700"
                      : idx % 4 === 2
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border border-rose-200 bg-rose-50 text-rose-700"
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {recipe.servings && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{recipe.servings}</span>}
          {recipe.cookTime && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{recipe.cookTime}{t("min")}</span>}
        </div>
      </div>
    </div>
  );
}

function ThumbnailCard({
  recipe,
  onNavigate,
  onToggleFavorite,
}: {
  recipe: any;
  onNavigate: () => void;
  onToggleFavorite: () => void;
}) {
  const firstImg = recipe.images?.length > 0 ? recipe.images[0] : recipe.imageUrl;

  return (
    <div className="recipe-card group" onClick={onNavigate}>
      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        {firstImg ? (
          <img src={firstImg} alt={recipe.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-103" />
        ) : (
          <ImagePlaceholder title={recipe.title} />
        )}
        <div className="absolute top-1.5 right-1.5">
          <FavoriteBtn isFavorite={recipe.isFavorite} onToggle={(e) => { e.stopPropagation(); onToggleFavorite(); }} />
        </div>
      </div>
      <div className="p-2.5">
        <h3 className="line-clamp-2 text-xs font-semibold leading-snug text-foreground">{recipe.title}</h3>
      </div>
    </div>
  );
}

function ListRow({
  recipe,
  onNavigate,
  onToggleFavorite,
}: {
  recipe: any;
  onNavigate: () => void;
  onToggleFavorite: () => void;
}) {
  const firstImg = recipe.images?.length > 0 ? recipe.images[0] : recipe.imageUrl;
  const t = useTranslation();

  return (
    <div
      className="flex cursor-pointer items-center gap-3 rounded-xl bg-card p-3 transition-all duration-150 hover:shadow-sm active:scale-[0.99]"
      style={{ boxShadow: "0 1px 3px oklch(0 0 0 / 0.05)" }}
      onClick={onNavigate}
    >
      <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
        {firstImg ? (
          <img src={firstImg} alt={recipe.title} className="h-full w-full object-cover" />
        ) : (
          <ImagePlaceholder title={recipe.title} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold text-foreground" style={{ letterSpacing: "-0.01em" }}>{recipe.title}</h3>
        {recipe.tags?.length > 0 && (
          <div className="mt-0.5 flex flex-wrap gap-1">
            {recipe.tags.slice(0, 3).map((tag: string) => (
              <span key={tag} className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-700">
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="mt-1 flex items-center gap-2.5 text-xs text-muted-foreground">
          {recipe.servings && <span className="flex items-center gap-0.5"><Users className="h-3 w-3" />{recipe.servings}</span>}
          {recipe.cookTime && <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{recipe.cookTime}{t("min")}</span>}
          {recipe.category && <span className="chip-default px-2 py-0.5 text-[10px]">{recipe.category}</span>}
        </div>
      </div>
      <FavoriteBtn isFavorite={recipe.isFavorite} onToggle={(e) => { e.stopPropagation(); onToggleFavorite(); }} />
    </div>
  );
}

function EmptyState({ onAdd, t }: { onAdd: () => void; t: (k: string) => string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-50 to-amber-100 shadow-sm">
        <span className="text-4xl">🍽️</span>
      </div>
      <h3 className="mb-1.5 text-base font-semibold text-foreground">{t("noRecipes")}</h3>
      <p className="mb-6 max-w-xs text-sm leading-relaxed text-muted-foreground">
        还没有菜谱，点击下方按钮添加你的第一道菜吧
      </p>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-95"
      >
        <Plus className="h-4 w-4" />
        {t("newRecipe")}
      </button>
    </div>
  );
}

function QuickActionCard({
  title,
  description,
  icon,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-3xl border border-border/70 bg-white/90 p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md dark:bg-zinc-900/80"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
        {icon}
      </div>
      <h3 className="mt-4 text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
    </button>
  );
}

export default function Home() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading, logout } = useAuth();
  const { recipes, searchRecipes, toggleFavorite, loading: recipesLoading, getRecipe } = useRecipes();
  const { dailyMenu } = useDailyMenu();
  const { weeklyMenus } = useWeeklyMenu();
  const { language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const t = useTranslation();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [homeMode, setHomeMode] = useState<HomeMode>(() => (localStorage.getItem("home-mode") as HomeMode) || "plan");
  const [sortType, setSortType] = useState<SortType>("date");
  const [viewMode, setViewMode] = useState<ViewMode>(() => (localStorage.getItem("home-view-mode") as ViewMode) || "grid");
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem("home-view-mode", mode);
  }, []);

  const handleModeChange = useCallback((mode: HomeMode) => {
    setHomeMode(mode);
    localStorage.setItem("home-mode", mode);
  }, []);

  const handleLogout = useCallback(async () => {
    await logout();
    window.location.href = getLoginUrl();
  }, [logout]);

  const categories = useMemo(
    () => Array.from(new Set(recipes.map((r) => r.category).filter((c): c is string => Boolean(c)))),
    [recipes]
  );

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    recipes.forEach((r) => (r.tags || []).forEach((tag) => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [recipes]);

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

  const favoriteCount = useMemo(() => recipes.filter((recipe) => recipe.isFavorite).length, [recipes]);
  const ratedCount = useMemo(() => recipes.filter((recipe) => (recipe.rating ?? 0) >= 4).length, [recipes]);
  const recentRecipes = useMemo(() => displayRecipes.slice(0, 4), [displayRecipes]);
  const favoriteRecipes = useMemo(() => recipes.filter((recipe) => recipe.isFavorite).slice(0, 4), [recipes]);

  const todayRecipes = useMemo(
    () =>
      dailyMenu.items
        .map((item) => {
          const recipe = getRecipe(item.recipeId);
          return recipe ? { ...item, recipe } : null;
        })
        .filter(Boolean) as Array<{ recipeId: string; servings: number; recipe: any }>,
    [dailyMenu.items, getRecipe]
  );

  const totalTodayCookTime = useMemo(
    () => todayRecipes.reduce((sum, item) => sum + (item.recipe.cookTime || 0), 0),
    [todayRecipes]
  );

  const activeWeeklyMenu = useMemo(() => weeklyMenus[0] || null, [weeklyMenus]);
  const weeklyDayCount = useMemo(() => {
    if (!activeWeeklyMenu) return 0;
    return Object.values(activeWeeklyMenu.items).filter((items) => items.length > 0).length;
  }, [activeWeeklyMenu]);

  const weeklyRecipeCount = useMemo(() => {
    if (!activeWeeklyMenu) return 0;
    return Object.values(activeWeeklyMenu.items).flat().length;
  }, [activeWeeklyMenu]);

  const weeklyPreview = useMemo(
    () =>
      activeWeeklyMenu
        ? Object.entries(activeWeeklyMenu.items)
            .filter(([, items]) => items.length > 0)
            .slice(0, 3)
        : [],
    [activeWeeklyMenu]
  );

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((entry) => entry !== tag) : [...prev, tag]));
  };

  const categoryLabel = showFavoritesOnly ? "❤️ 收藏" : selectedCategory ? selectedCategory : t("all") || "全部";

  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
    touchEndX.current = null;
  }, []);

  const handleTouchEnd = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    touchEndX.current = event.changedTouches[0]?.clientX ?? null;
    if (touchStartX.current == null || touchEndX.current == null) return;

    const delta = touchStartX.current - touchEndX.current;
    if (Math.abs(delta) < 40) return;
    handleModeChange(delta > 0 ? "plan" : "collect");
  }, [handleModeChange]);

  if (!authLoading && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-50 to-amber-100 shadow-sm">
            <span className="text-4xl">🍳</span>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-foreground">{t("appTitle")}</h1>
          <p className="mb-8 text-sm text-muted-foreground">{t("yourRecipes")}</p>
          <button
            onClick={() => (window.location.href = getLoginUrl())}
            className="w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-95"
          >
            {t("login") || "Login"}
          </button>
        </div>
      </div>
    );
  }

  if (authLoading || recipesLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">加载中…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex flex-shrink items-center gap-2.5">
              <img
                src="/icons/icon-192.png"
                alt="WangCai"
                className="h-8 w-8 flex-shrink-0 rounded-xl border border-amber-200/80 shadow-sm"
              />
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold leading-tight text-foreground" style={{ letterSpacing: "-0.02em" }}>
                  {t("appTitle")}
                </h1>
                <p className="hidden text-[11px] text-muted-foreground sm:block">{t("yourRecipes")}</p>
              </div>
            </div>

            <div className="flex flex-shrink-0 items-center gap-2">
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/80"
                      aria-label="Account"
                    >
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[11px] font-semibold">{(user.name || user.email || "?").slice(0, 1).toUpperCase()}</span>
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 rounded-xl">
                    <DropdownMenuItem onClick={() => navigate("/account")} className="rounded-lg text-sm">
                      {t("accountManagement") || "Account"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="rounded-lg text-sm">
                      {t("logout") || "Sign out"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <button
                onClick={() => navigate("/menu")}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-xs font-semibold text-amber-700 transition-all hover:bg-amber-100 active:scale-95"
                aria-label={t("menuOverview") || "菜单概览"}
                title={t("menuOverview") || "菜单概览"}
              >
                <UtensilsCrossed className="h-3.5 w-3.5" />
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-xs font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-95"
                    aria-label={t("newRecipe") || "新建菜谱"}
                    title={t("newRecipe") || "新建菜谱"}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 rounded-xl">
                  <DropdownMenuItem onClick={() => setShowAddDialog(true)} className="gap-2 rounded-lg text-sm">
                    <Plus className="h-4 w-4 text-muted-foreground" />
                    {t("newRecipe") || "新建菜谱"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowAIDialog(true)} className="gap-2 rounded-lg text-sm">
                    <Sparkles className="h-4 w-4 text-primary" />
                    {t("generateWithAI") || "AI 生成"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowImportDialog(true)} className="gap-2 rounded-lg text-sm">
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    {t("importRecipe") || "导入菜谱"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/80">
                    {LANG_LABELS[language] || language.slice(0, 2)}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-28 rounded-xl">
                  {languages.map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      onClick={() => setLanguage(lang.code as any)}
                      className="justify-between gap-2 rounded-lg text-sm"
                    >
                      <span>{lang.name}</span>
                      {language === lang.code && <Check className="h-3.5 w-3.5 text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <button
                onClick={() => toggleTheme?.()}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-muted/80"
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                title={theme === "dark" ? "浅色模式" : "深色模式"}
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container space-y-4 py-4 lg:py-3">
        <section className="rounded-[30px] border border-border/70 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(255,249,240,0.96))] p-4 shadow-sm dark:bg-[linear-gradient(180deg,_rgba(39,39,42,0.98),_rgba(24,24,27,0.96))]">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-700/80">{t("appTitle")}</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                {homeMode === "collect" ? (t("collectModeTab") || "菜单收集") : (t("planModeTab") || "用餐计划")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {homeMode === "collect"
                  ? (t("collectModeDesc") || "只专注菜谱收录、整理和筛选，让菜谱库本身足够清楚。")
                  : (t("planModeDesc") || "只保留计划相关内容：今天做什么、这周怎么排、下一步去哪里。")}
              </p>
            </div>

            <div className="self-start rounded-full bg-muted p-1 shadow-inner">
              <div className="flex items-center gap-1">
                {([
                  ["collect", t("collectModeTab") || "菜单收集"],
                  ["plan", t("planModeTab") || "用餐计划"],
                ] as [HomeMode, string][]).map(([mode, label]) => (
                  <button
                    key={mode}
                    onClick={() => handleModeChange(mode)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                      homeMode === mode ? "bg-white text-foreground shadow-sm dark:bg-zinc-800" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">{t("modeSwitchHint") || "点上方切换，也可以在手机上左右滑动。"}</p>
        </section>

        <div className="overflow-hidden" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <div
            className="flex transition-transform duration-300 ease-out"
            style={{ width: "200%", transform: `translateX(${homeMode === "collect" ? "0%" : "-50%"})` }}
          >
            <section className="w-1/2 shrink-0 space-y-4 pr-0 md:pr-2">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="rounded-[28px] border border-amber-200/70 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_34%),linear-gradient(135deg,_rgba(255,251,235,0.98),_rgba(255,255,255,0.96))] p-5 shadow-sm">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-700/80">{t("recipes") || "菜谱库"}</p>
                      <h3 className="mt-2 text-xl font-semibold text-foreground">{t("recipeCollectionHero") || "把菜谱收集得清楚，后面计划才会轻松"}</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-2xl bg-white/80 px-3 py-2 shadow-sm">
                        <p className="text-muted-foreground">{t("recipes") || "菜谱"}</p>
                        <p className="mt-1 text-lg font-semibold text-foreground">{recipes.length}</p>
                      </div>
                      <div className="rounded-2xl bg-white/80 px-3 py-2 shadow-sm">
                        <p className="text-muted-foreground">{t("favorites") || "收藏"}</p>
                        <p className="mt-1 text-lg font-semibold text-foreground">{favoriteCount}</p>
                      </div>
                      <div className="rounded-2xl bg-white/80 px-3 py-2 shadow-sm">
                        <p className="text-muted-foreground">{t("highRated") || "高分"}</p>
                        <p className="mt-1 text-lg font-semibold text-foreground">{ratedCount}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <QuickActionCard
                      title={t("newRecipe") || "新建菜谱"}
                      description={t("newRecipeDesc") || "把家里的常做菜、家传菜和灵感正式收进来。"}
                      icon={<FolderPlus className="h-5 w-5" />}
                      onClick={() => setShowAddDialog(true)}
                    />
                    <QuickActionCard
                      title={t("importRecipe") || "导入菜谱"}
                      description={t("importRecipeDesc") || "从外部来源快速收录，减少重复录入。"}
                      icon={<NotebookTabs className="h-5 w-5" />}
                      onClick={() => setShowImportDialog(true)}
                    />
                    <QuickActionCard
                      title={t("generateWithAI") || "AI 生成"}
                      description={t("generateWithAIDesc") || "先生成草稿，再按你家的习惯修改。"}
                      icon={<WandSparkles className="h-5 w-5" />}
                      onClick={() => setShowAIDialog(true)}
                    />
                  </div>
                </div>

                <aside className="rounded-[28px] border border-border/70 bg-card/95 p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t("recentlyUpdated") || "最近常看"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{t("recentlyUpdatedDesc") || "从常看的菜谱继续整理，不用每次都从头找。"}</p>
                    </div>
                    <button
                      onClick={() => setShowFavoritesOnly((prev) => !prev)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        showFavoritesOnly ? "bg-rose-100 text-rose-700" : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t("favorites") || "收藏"}
                    </button>
                  </div>
                  <div className="mt-4 space-y-2">
                    {(favoriteRecipes.length > 0 ? favoriteRecipes : recentRecipes).slice(0, 4).map((recipe) => (
                      <button
                        key={recipe.id}
                        onClick={() => navigate(`/recipe/${recipe.id}`)}
                        className="flex w-full items-center justify-between rounded-2xl border border-border/70 bg-background/80 px-3 py-3 text-left transition-colors hover:border-amber-300 hover:bg-amber-50/50 dark:bg-zinc-950/40"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">{recipe.title}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {recipe.category || (t("category") || "分类")}
                            {recipe.cookTime ? ` · ${recipe.cookTime}${t("min") || "min"}` : ""}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))}
                    {recentRecipes.length === 0 && (
                      <p className="rounded-2xl border border-dashed border-border/70 px-3 py-4 text-xs text-muted-foreground">
                        {t("noRecipesDescShort") || "还没有菜谱，先添加第一道菜吧。"}
                      </p>
                    )}
                  </div>
                </aside>
              </div>

              <div className="relative lg:max-w-[720px]">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  className="search-input"
                  placeholder={t("searchRecipes") || "搜索菜名、食材、标签…"}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="icon-btn absolute right-3 top-1/2 h-6 w-6 -translate-y-1/2">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/50">
                      {categoryLabel}
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-44 rounded-xl">
                    <DropdownMenuItem
                      onClick={() => { setSelectedCategory(null); setShowFavoritesOnly(false); }}
                      className="justify-between gap-2 rounded-lg text-sm"
                    >
                      <span>{t("all") || "全部"}</span>
                      {!selectedCategory && !showFavoritesOnly && <Check className="h-3.5 w-3.5 text-primary" />}
                    </DropdownMenuItem>
                    {categories.length > 0 && <DropdownMenuSeparator />}
                    {categories.map((cat) => (
                      <DropdownMenuItem
                        key={cat}
                        onClick={() => { setSelectedCategory(selectedCategory === cat ? null : cat); setShowFavoritesOnly(false); }}
                        className="justify-between gap-2 rounded-lg text-sm"
                      >
                        <span>{cat}</span>
                        {selectedCategory === cat && <Check className="h-3.5 w-3.5 text-primary" />}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => { setShowFavoritesOnly(!showFavoritesOnly); setSelectedCategory(null); }}
                      className="justify-between gap-2 rounded-lg text-sm"
                    >
                      <span className="flex items-center gap-1.5"><Heart className="h-3.5 w-3.5 text-red-400" />收藏</span>
                      {showFavoritesOnly && <Check className="h-3.5 w-3.5 text-primary" />}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex flex-shrink-0 items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/50">
                      <span>{sortType === "date" ? t("sortByDate") || "按日期" : sortType === "name" ? t("sortByName") || "按名称" : "按评分"}</span>
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-32 rounded-xl">
                    <DropdownMenuItem onClick={() => setSortType("date")} className="justify-between rounded-lg text-sm">
                      <span>{t("sortByDate") || "按日期"}</span>
                      {sortType === "date" && <Check className="h-3.5 w-3.5 text-primary" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortType("name")} className="justify-between rounded-lg text-sm">
                      <span>{t("sortByName") || "按名称"}</span>
                      {sortType === "name" && <Check className="h-3.5 w-3.5 text-primary" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortType("rating")} className="justify-between rounded-lg text-sm">
                      <span>按评分</span>
                      {sortType === "rating" && <Check className="h-3.5 w-3.5 text-primary" />}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="flex-1" />

                <div className="flex flex-shrink-0 items-center gap-0.5 rounded-lg bg-muted p-0.5">
                  {([["grid", Grid3x3], ["thumbnail", Grid2x2], ["list", List]] as [ViewMode, any][]).map(([mode, Icon]) => (
                    <button
                      key={mode}
                      onClick={() => handleViewModeChange(mode)}
                      className={`flex h-7 w-7 items-center justify-center rounded-md transition-all ${
                        viewMode === mode ? "bg-white text-foreground shadow-sm dark:bg-zinc-800" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </button>
                  ))}
                </div>
              </div>

              {allTags.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`flex-shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all ${
                        selectedTags.includes(tag)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                  {selectedTags.length > 0 && (
                    <button
                      onClick={() => setSelectedTags([])}
                      className="flex flex-shrink-0 items-center gap-1 rounded-full border border-transparent px-2 py-1 text-[11px] text-muted-foreground transition-all hover:border-border hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                      清除
                    </button>
                  )}
                </div>
              )}

              {displayRecipes.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {displayRecipes.length} 道菜谱
                  {searchQuery && ` · 搜索 "${searchQuery}"`}
                </p>
              )}

              {displayRecipes.length === 0 ? (
                <EmptyState onAdd={() => setShowAddDialog(true)} t={t} />
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
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
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
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
            </section>

            <section className="w-1/2 shrink-0 space-y-4 pl-0 md:pl-2">
              <div className="rounded-[28px] border border-cyan-200/70 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.16),_transparent_34%),linear-gradient(135deg,_rgba(236,254,255,0.98),_rgba(255,255,255,0.96))] p-5 shadow-sm dark:bg-[radial-gradient(circle_at_top_left,_rgba(8,145,178,0.2),_transparent_34%),linear-gradient(135deg,_rgba(8,47,73,0.7),_rgba(24,24,27,0.96))]">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-700/80">{t("todayMenu") || "用餐计划"}</p>
                    <h3 className="mt-2 text-xl font-semibold text-foreground">{t("planHeroTitle") || "先决定吃什么，再进入执行"}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("planHeroDesc") || "这个模式只保留计划相关内容：今日菜单、周计划和下一步动作。"}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-2xl bg-white/80 px-3 py-2 shadow-sm">
                      <p className="text-muted-foreground">{t("todayMenu") || "今日菜单"}</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">{todayRecipes.length}</p>
                    </div>
                    <div className="rounded-2xl bg-white/80 px-3 py-2 shadow-sm">
                      <p className="text-muted-foreground">{t("weekPlan") || "本周"}</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">{weeklyDayCount}</p>
                    </div>
                    <div className="rounded-2xl bg-white/80 px-3 py-2 shadow-sm">
                      <p className="text-muted-foreground">{t("totalCookTime") || "时长"}</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">{totalTodayCookTime}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => navigate("/menu")}
                    className="rounded-full bg-cyan-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-cyan-500"
                  >
                    {t("menuOverview") || "去点菜"}
                  </button>
                  <button
                    onClick={() => navigate("/today")}
                    className="rounded-full border border-border/80 px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                  >
                    {t("todayMenu") || "今日菜单"}
                  </button>
                  <button
                    onClick={() => navigate("/weekly")}
                    className="rounded-full border border-border/80 px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                  >
                    {t("weeklyMenu") || "周计划"}
                  </button>
                  <button
                    onClick={() => navigate("/today")}
                    className="rounded-full border border-border/80 px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                  >
                    {t("shareMenu") || "分享"}
                  </button>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="rounded-[28px] border border-border/70 bg-card/95 p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t("todayMenu") || "今日菜单"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{t("todayPlanCardDesc") || "今天真正准备做的菜，先从这里开始。"}</p>
                    </div>
                    <button
                      onClick={() => navigate("/today")}
                      className="rounded-full border border-border/80 px-3 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                    >
                      {t("open") || "打开"}
                    </button>
                  </div>
                  <div className="mt-4 space-y-2">
                    {todayRecipes.length === 0 ? (
                      <p className="rounded-2xl border border-dashed border-border/70 px-3 py-5 text-sm text-muted-foreground">
                        {t("todayEmptyHint") || "今天还没有选菜，先去菜单收集里挑菜加入今日菜单。"}
                      </p>
                    ) : (
                      todayRecipes.slice(0, 4).map((item) => (
                        <div key={item.recipeId} className="rounded-2xl border border-border/70 bg-background/70 px-3 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-foreground">{item.recipe.title}</p>
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                {item.servings} {t("servingsUnit") || "份"}
                                {item.recipe.cookTime ? ` · ${item.recipe.cookTime}${t("min") || "min"}` : ""}
                              </p>
                            </div>
                            <UtensilsCrossed className="h-4 w-4 text-cyan-700" />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <aside className="rounded-[28px] border border-border/70 bg-card/95 p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t("weeklyMenu") || "周计划"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{t("weekPlanCardDesc") || "按周看安排，避免每天重新决定。"}</p>
                    </div>
                    <button
                      onClick={() => navigate("/weekly")}
                      className="rounded-full border border-border/80 px-3 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                    >
                      {t("open") || "打开"}
                    </button>
                  </div>
                  <div className="mt-4 space-y-2">
                    {weeklyPreview.length === 0 ? (
                      <p className="rounded-2xl border border-dashed border-border/70 px-3 py-5 text-sm text-muted-foreground">
                        {t("weeklyEmptyHint") || "本周还没开始安排，可以先从今日菜单或周计划页建立第一份计划。"}
                      </p>
                    ) : (
                      weeklyPreview.map(([day, items]) => (
                        <div key={day} className="rounded-2xl border border-border/70 bg-background/70 px-3 py-3">
                          <p className="text-sm font-medium text-foreground">{DAY_LABELS[day] || day}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">{items.length} {t("recipes") || "菜谱"}</p>
                        </div>
                      ))
                    )}
                    <button
                      onClick={() => navigate("/menu")}
                      className="flex w-full items-center justify-between rounded-2xl border border-cyan-200 bg-cyan-50/70 px-3 py-3 text-left transition-colors hover:bg-cyan-100/70"
                    >
                      <div>
                        <p className="text-sm font-medium text-cyan-900">{t("menuOverview") || "去点菜"}</p>
                        <p className="mt-1 text-[11px] text-cyan-800/70">{t("planFromLibraryHint") || "从现有菜谱里挑菜，推进到今天或这一周。"}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-cyan-700" />
                    </button>
                    <button
                      onClick={() => navigate("/today")}
                      className="flex w-full items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/70 px-3 py-3 text-left transition-colors hover:bg-emerald-100/70"
                    >
                      <div>
                        <p className="text-sm font-medium text-emerald-900">{t("shareMenu") || "分享菜单"}</p>
                        <p className="mt-1 text-[11px] text-emerald-800/70">{t("shareMenuHint") || "进入执行页，继续购物清单和共享操作。"}</p>
                      </div>
                      <Share2 className="h-4 w-4 text-emerald-700" />
                    </button>
                  </div>
                </aside>
              </div>
            </section>
          </div>
        </div>
      </main>

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
