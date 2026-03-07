import { useLocation, useRoute } from "wouter";
import { useRecipes } from "@/contexts/RecipeContext";
import { useTranslation, useFormatUnit } from "@/hooks/useTranslation";
import { ArrowLeft, ChefHat, Download, ExternalLink, StickyNote, Edit2, Trash2, Loader2, Star } from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import EditRecipeDialog from "@/components/EditRecipeDialog";
import { exportRecipeToPDF } from "@/lib/pdfExport";
import { Heart } from "lucide-react";
import { toast } from "sonner";

/**
 * Recipe Detail Page
 * - Sticky top navbar (scroll-aware: transparent → frosted glass)
 * - Fixed bottom action bar (start cooking + export PDF)
 * - 380px sticky ingredients sidebar on desktop
 * - Ingredient checklist, timeline steps, info badges, 5-star rating
 */

// ── Swipe image carousel ───────────────────────────────────────────────────
function ImageCarousel({ images, title }: { images: string[]; title: string }) {
  const [idx, setIdx] = useState(0);
  const startX = useRef<number | null>(null);
  const isDragging = useRef(false);

  const prev = useCallback(() => setIdx((i) => (i - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setIdx((i) => (i + 1) % images.length), [images.length]);

  const onTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current === null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    if (Math.abs(dx) > 40) dx < 0 ? next() : prev();
    startX.current = null;
  };
  const onMouseDown = (e: React.MouseEvent) => { startX.current = e.clientX; isDragging.current = false; };
  const onMouseMove = (e: React.MouseEvent) => {
    if (startX.current !== null && Math.abs(e.clientX - startX.current) > 5) isDragging.current = true;
  };
  const onMouseUp = (e: React.MouseEvent) => {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    if (isDragging.current && Math.abs(dx) > 40) dx < 0 ? next() : prev();
    startX.current = null;
    isDragging.current = false;
  };

  if (!images || images.length === 0) {
    return (
      <div className="w-full aspect-[16/9] md:aspect-auto md:h-72 lg:h-[300px] bg-gradient-to-br from-orange-50 to-amber-100 flex flex-col items-center justify-center gap-3">
        <span className="text-6xl">🍽️</span>
        <span className="text-sm text-muted-foreground">暂无图片</span>
      </div>
    );
  }

  return (
    <div
      className="relative w-full aspect-[16/9] md:aspect-auto md:h-72 lg:h-[300px] bg-muted overflow-hidden select-none cursor-grab active:cursor-grabbing"
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown} onMouseMove={onMouseMove}
      onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
    >
      <div
        className="flex h-full transition-transform duration-300 ease-out"
        style={{ width: `${images.length * 100}%`, transform: `translateX(-${(idx * 100) / images.length}%)` }}
      >
        {images.map((src, i) => (
          <div key={i} className="h-full flex-shrink-0" style={{ width: `${100 / images.length}%` }}>
            <img src={src} alt={`${title} ${i + 1}`} className="w-full h-full object-cover pointer-events-none" draggable={false} />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 pointer-events-none">
          {images.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === idx ? "bg-white w-4" : "bg-white/50 w-1.5"}`} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Info badge ─────────────────────────────────────────────────────────────
function InfoBadge({ emoji, label }: { emoji: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full text-sm font-medium text-foreground">
      <span>{emoji}</span>
      <span>{label}</span>
    </span>
  );
}

// ── Star rating ────────────────────────────────────────────────────────────
function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star === value ? 0 : star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="p-0.5 transition-transform hover:scale-110 active:scale-95"
          aria-label={`${star} 星`}
        >
          <Star className={`w-5 h-5 transition-colors ${star <= (hover || value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
        </button>
      ))}
      {value > 0 && <span className="ml-1.5 text-xs text-muted-foreground">{value}/5</span>}
    </div>
  );
}

// ── Ingredient checklist item ──────────────────────────────────────────────
function IngredientItem({ name, amount, unit, checked, onToggle, formatUnit }: {
  name: string; amount: number; unit: string; checked: boolean; onToggle: () => void;
  formatUnit: (u: string) => string;
}) {
  return (
    <li
      className={`grid items-center py-2 px-2 rounded-lg cursor-pointer transition-colors ${checked ? "opacity-50" : "hover:bg-muted/60"}`}
      style={{ gridTemplateColumns: '16px 44px 44px 1fr' }}
      onClick={onToggle}
    >
      <div className={`w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${checked ? "bg-primary border-primary" : "border-border"}`}>
        {checked && (
          <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" viewBox="0 0 12 12">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span className={`text-sm text-right pr-1 tabular-nums ${checked ? "line-through text-muted-foreground" : "font-semibold text-foreground"}`}>
        {amount > 0 ? amount : ""}
      </span>
      <span className={`text-sm px-1 ${checked ? "line-through text-muted-foreground" : "text-foreground/60"}`}>
        {formatUnit(unit)}
      </span>
      <span className={`text-sm leading-relaxed ${checked ? "line-through text-muted-foreground" : "text-foreground"}`}>
        {name}
      </span>
    </li>
  );
}

export default function RecipeDetail() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/recipe/:id");
  const { getRecipe, deleteRecipe, toggleFavorite, updateRecipe } = useRecipes();
  const t = useTranslation();
  const fu = useFormatUnit();

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [portionMultiplier, setPortionMultiplier] = useState(1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());
  // Track scroll to show/hide frosted glass on top navbar
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const recipe = params?.id ? getRecipe(params.id) : undefined;

  if (!recipe) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔍</span>
          </div>
          <h1 className="text-lg font-bold text-foreground mb-2">菜谱未找到</h1>
          <button onClick={() => navigate("/")} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium mx-auto transition-all hover:bg-primary/90">
            <ArrowLeft className="w-4 h-4" />返回菜谱列表
          </button>
        </div>
      </div>
    );
  }

  const handleDelete = () => { deleteRecipe(recipe.id); navigate("/"); };

  const handleExportPDF = async () => {
    if (isPdfExporting) return;
    setIsPdfExporting(true);
    const toastId = toast.loading("正在生成 PDF…请稍候（约 5-10 秒）");
    try {
      await exportRecipeToPDF(recipe);
      toast.success(`PDF 已下载：${recipe.title}.pdf`, { id: toastId });
    } catch (err: any) {
      toast.error(`PDF 导出失败：${err?.message || "请稍后重试"}`, { id: toastId });
    } finally {
      setIsPdfExporting(false);
    }
  };

  const handleRating = async (newRating: number) => {
    try {
      await updateRecipe(recipe.id, { rating: newRating });
      toast.success(newRating === 0 ? "已清除评分" : `已评 ${newRating} 星`);
    } catch { toast.error("评分保存失败"); }
  };

  const toggleIngredient = (id: string) => {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allImages = recipe.images && recipe.images.length > 0
    ? recipe.images
    : recipe.imageUrl ? [recipe.imageUrl] : [];

  const sortedSteps = [...recipe.steps].sort((a, b) => (a.number ?? 0) - (b.number ?? 0));

  return (
    <div className="min-h-screen bg-background pb-24">

      {/* ── Sticky top navbar ── */}
      <div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/90 backdrop-blur-md border-b border-border/50 shadow-sm"
          : "bg-transparent"
      }`}>
        <div className="container lg:max-w-[1200px] flex items-center justify-between h-14">
          {/* Left: back button */}
          <button
            onClick={() => navigate("/")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all active:scale-95 ${
              scrolled
                ? "text-foreground hover:bg-muted"
                : "text-white/90 hover:text-white bg-black/20 hover:bg-black/30 backdrop-blur-sm"
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">返回</span>
          </button>

          {/* Center: title (only when scrolled) */}
          <div className={`flex-1 mx-4 transition-all duration-300 ${scrolled ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
            <p className="text-sm font-semibold text-foreground truncate text-center">{recipe.title}</p>
          </div>

          {/* Right: favorite + edit */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => toggleFavorite(recipe.id)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 ${
                scrolled
                  ? "hover:bg-muted text-foreground"
                  : "bg-black/20 hover:bg-black/30 backdrop-blur-sm text-white"
              }`}
            >
              <Heart className={`w-4 h-4 ${recipe.isFavorite ? "fill-red-500 text-red-500" : ""}`} />
            </button>
            <button
              onClick={() => setShowEditDialog(true)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 ${
                scrolled
                  ? "hover:bg-muted text-foreground"
                  : "bg-black/20 hover:bg-black/30 backdrop-blur-sm text-white"
              }`}
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Hero (full-bleed, no top padding since navbar is fixed/transparent) ── */}
      <ImageCarousel images={allImages} title={recipe.title} />

      {/* ── Content container ── */}
      <div className="container lg:max-w-[1200px]">

        {/* ── Title + rating ── */}
        <div className="pt-5 pb-3">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground leading-tight mb-1" style={{ letterSpacing: "-0.025em" }}>
            {recipe.title}
          </h1>
          {recipe.description && (
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed max-w-2xl">{recipe.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-3">
            {recipe.category && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent text-accent-foreground">
                {recipe.category}
              </span>
            )}
            <StarRating value={recipe.rating ?? 0} onChange={handleRating} />
          </div>
        </div>

        {/* ── Info badges ── */}
        <div className="flex flex-wrap gap-2 mb-4">
          {recipe.servings && <InfoBadge emoji="👥" label={`${Math.round(recipe.servings * portionMultiplier * 10) / 10} ${t("servings") || "人份"}`} />}
          {recipe.prepTime && <InfoBadge emoji="⏱" label={`${t("prepTime") || "备料"} ${recipe.prepTime}${t("min") || "分钟"}`} />}
          {recipe.cookTime && <InfoBadge emoji="🔥" label={`${t("cookTime") || "烹饪"} ${recipe.cookTime}${t("min") || "分钟"}`} />}
        </div>

        {/* ── Portion selector ── */}
        <div className="mb-6">
          <p className="text-xs font-medium text-muted-foreground mb-2">{t("servings") || "份量"} 调整</p>
          <div className="flex gap-1.5">
            {[0.5, 0.75, 1, 1.5, 2].map((m) => (
              <button
                key={m}
                onClick={() => setPortionMultiplier(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  portionMultiplier === m ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-secondary"
                }`}
              >
                {m === 0.5 ? "½" : m === 0.75 ? "¾" : m}x
              </button>
            ))}
          </div>
        </div>

        {/* ── Two-column layout: 380px sidebar | 1fr steps ── */}
        <div className="grid lg:grid-cols-[380px_1fr] gap-8 items-start">

          {/* LEFT: Ingredients sidebar (sticky) */}
          <div className="lg:sticky lg:top-[72px]">
            <div className="section-card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-foreground" style={{ letterSpacing: "-0.01em" }}>
                  {t("ingredients") || "食材"}
                </h2>
                {checkedIngredients.size > 0 && (
                  <button onClick={() => setCheckedIngredients(new Set())} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    重置
                  </button>
                )}
              </div>
              <ul className="space-y-0.5">
                {recipe.ingredients.map((ingredient) => {
                  const scaledAmount = Math.round(ingredient.amount * portionMultiplier * 100) / 100;
                  return (
                    <IngredientItem
                      key={ingredient.id}
                      name={ingredient.name}
                      amount={scaledAmount}
                      unit={ingredient.unit}
                      checked={checkedIngredients.has(ingredient.id)}
                      onToggle={() => toggleIngredient(ingredient.id)}
                      formatUnit={fu}
                    />
                  );
                })}
              </ul>
              {recipe.ingredients.length > 0 && (
                <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/50">
                  {checkedIngredients.size}/{recipe.ingredients.length} 已准备
                </p>
              )}
            </div>
          </div>

          {/* RIGHT: Steps + Notes + Source + Delete */}
          <div className="space-y-5 max-w-[720px]">

            {/* Steps – timeline style */}
            <div className="section-card">
              <h2 className="text-base font-bold text-foreground mb-5" style={{ letterSpacing: "-0.01em" }}>
                {t("steps") || "步骤"}
              </h2>
              <div className="space-y-6">
                {sortedSteps.map((step, index) => (
                  <div key={step.id} className="grid grid-cols-[32px_1fr] gap-4">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {index + 1}
                      </div>
                      {index < sortedSteps.length - 1 && (
                        <div className="w-px flex-1 min-h-[16px] bg-border/60" />
                      )}
                    </div>
                    <div className="pb-2">
                      <p className="text-sm text-foreground leading-relaxed pt-1">{step.description}</p>
                      {step.duration && (
                        <span className="inline-flex items-center gap-1 mt-2 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          ⏱ {step.duration} {t("min") || "分钟"}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            {recipe.notes && (
              <div className="section-card">
                <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2" style={{ letterSpacing: "-0.01em" }}>
                  <StickyNote className="w-4 h-4 text-primary" />
                  {t("notes") || "备注"}
                </h2>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{recipe.notes}</p>
              </div>
            )}

            {/* Source URL */}
            {recipe.sourceUrl && (
              <div className="section-card">
                <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2" style={{ letterSpacing: "-0.01em" }}>
                  <ExternalLink className="w-4 h-4 text-primary" />
                  {t("source") || "来源"}
                </h2>
                <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all flex items-start gap-1.5">
                  <span className="flex-1">{recipe.sourceUrl}</span>
                  <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                </a>
              </div>
            )}


          </div>
        </div>
      </div>

      {/* ── Fixed bottom action bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-t border-border/50 shadow-lg">
        <div className="container lg:max-w-[1200px] flex items-center gap-3 py-3">
          {/* Start cooking – primary */}
          <button
            onClick={() => navigate(`/cook/${recipe.id}?multiplier=${portionMultiplier}`)}
            className="flex-1 lg:flex-none lg:min-w-[200px] py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:bg-primary/90 active:scale-[0.99]"
          >
            <ChefHat className="w-4 h-4" />
            {t("startCooking") || "开始烹饪"}
          </button>

          {/* Export PDF – secondary */}
          <button
            onClick={handleExportPDF}
            disabled={isPdfExporting}
            className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground bg-muted hover:bg-secondary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPdfExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span className="hidden sm:inline">{isPdfExporting ? "生成中…" : "导出 PDF"}</span>
          </button>

          {/* Delete – low-key, at end of bar */}
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">删除</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground hidden sm:inline">确认删除？</span>
              <button onClick={handleDelete} className="px-3 py-2 text-xs bg-destructive text-destructive-foreground rounded-lg font-medium hover:bg-destructive/90 transition-colors">
                删除
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground rounded-lg transition-colors">
                取消
              </button>
            </div>
          )}
        </div>
      </div>

      <EditRecipeDialog recipe={recipe} open={showEditDialog} onOpenChange={setShowEditDialog} />
    </div>
  );
}
