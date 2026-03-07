import { useState, useEffect, useRef, useMemo } from "react";
import { nanoid } from "nanoid";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRecipes, getAllTags } from "@/contexts/RecipeContext";
import { useTranslation, useFormatUnit } from "@/hooks/useTranslation";
import { Recipe, Ingredient, Step } from "@/types/recipe";
import { ImagePlus, Loader2, Plus, X, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface AddRecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Apple-style grouped form field ────────────────────────────────────────────
function FieldGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] overflow-hidden divide-y divide-black/[0.06] dark:divide-white/[0.08]">
      {children}
    </div>
  );
}

function Field({
  label,
  children,
  suffix,
}: {
  label: string;
  children: React.ReactNode;
  suffix?: string;
}) {
  return (
    <div className="flex items-start gap-0 px-4 py-3">
      <span className="text-sm font-medium text-foreground/70 w-28 flex-shrink-0 pt-[9px] leading-snug">{label}</span>
      <div className="flex-1 min-w-0 flex items-start gap-1.5">
        <div className="flex-1 min-w-0">{children}</div>
        {suffix && <span className="text-sm text-muted-foreground pt-[9px] flex-shrink-0">{suffix}</span>}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2 mt-5 first:mt-0">
      {children}
    </h3>
  );
}

export default function AddRecipeDialog({ open, onOpenChange }: AddRecipeDialogProps) {
  const { addRecipe, recipes } = useRecipes();
  const t = useTranslation();
  const fu = useFormatUnit();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const existingCategories = useMemo(() => {
    const cats = new Set<string>();
    recipes.forEach((r) => { if (r.category) cats.add(r.category); });
    return Array.from(cats).sort();
  }, [recipes]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [servings, setServings] = useState("4");
  const [prepTime, setPrepTime] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [blobFileMap, setBlobFileMap] = useState<Map<string, File>>(new Map());
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { id: nanoid(), name: "", amount: 0, unit: "g" },
  ]);
  const [steps, setSteps] = useState<Step[]>([
    { id: nanoid(), number: 1, description: "" },
  ]);
  const [notes, setNotes] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const existingTags = getAllTags(recipes);

  // Load generated recipe from sessionStorage
  useEffect(() => {
    if (open) {
      const generatedRecipe = sessionStorage.getItem("generatedRecipe");
      if (generatedRecipe) {
        try {
          const recipe = JSON.parse(generatedRecipe);
          setTitle(recipe.title || "");
          setDescription(recipe.description || "");
          setCategory(recipe.category || "");
          setServings(String(recipe.servings || 4));
          setPrepTime(String(recipe.prepTime || ""));
          setCookTime(String(recipe.cookTime || ""));
          setTags([]);
          if (recipe.ingredients?.length > 0) {
            setIngredients(recipe.ingredients.map((ing: any) => ({
              id: nanoid(),
              name: ing.name || "",
              amount: ing.amount || 0,
              unit: ing.unit || "g",
            })));
          }
          if (recipe.steps?.length > 0) {
            setSteps(recipe.steps.map((step: any, idx: number) => ({
              id: nanoid(),
              number: step.number || idx + 1,
              description: step.description || "",
            })));
          }
          if (recipe.notes) setNotes(recipe.notes);
          if (recipe.sourceUrl) setSourceUrl(recipe.sourceUrl);
          if (recipe.imageUrl) {
            setImages([recipe.imageUrl]);
            setCurrentImageIndex(0);
          } else if (recipe.images?.length > 0) {
            setImages(recipe.images);
            setCurrentImageIndex(0);
          }
          sessionStorage.removeItem("generatedRecipe");
        } catch (e) {
          console.error("Failed to parse generated recipe:", e);
        }
      }
    }
  }, [open]);

  const uploadImageFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/upload-image", { method: "POST", body: formData, credentials: "include" });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err as any).error || "Upload failed");
    }
    const { url } = await response.json();
    return url;
  };

  const handleFilesSelected = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const previewUrl = URL.createObjectURL(file);
      setBlobFileMap((prev) => { const next = new Map(prev); next.set(previewUrl, file); return next; });
      setImages((prev) => { const next = [...prev, previewUrl]; setCurrentImageIndex(next.length - 1); return next; });
    });
  };

  const handleRemoveImage = (idx: number) => {
    setImages((prev) => {
      const removed = prev[idx];
      if (removed?.startsWith("blob:")) {
        URL.revokeObjectURL(removed);
        setBlobFileMap((m) => { const next = new Map(m); next.delete(removed); return next; });
      }
      const next = prev.filter((_, i) => i !== idx);
      setCurrentImageIndex(Math.min(currentImageIndex, Math.max(0, next.length - 1)));
      return next;
    });
  };

  const handleAddIngredient = () =>
    setIngredients([...ingredients, { id: nanoid(), name: "", amount: 0, unit: "g" }]);
  const handleRemoveIngredient = (id: string) =>
    setIngredients(ingredients.filter((ing) => ing.id !== id));
  const handleUpdateIngredient = (id: string, field: keyof Ingredient, value: string | number) =>
    setIngredients(ingredients.map((ing) => (ing.id === id ? { ...ing, [field]: value } : ing)));

  const handleAddStep = () => {
    const newOrder = Math.max(...steps.map((s) => s.number), 0) + 1;
    setSteps([...steps, { id: nanoid(), number: newOrder, description: "" }]);
  };
  const handleRemoveStep = (id: string) => setSteps(steps.filter((step) => step.id !== id));
  const handleUpdateStep = (id: string, description: string) =>
    setSteps(steps.map((step) => (step.id === id ? { ...step, description } : step)));

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };
  const handleRemoveTag = (tag: string) => setTags(tags.filter((t) => t !== tag));
  const handleAddExistingTag = (tag: string) => { if (!tags.includes(tag)) setTags([...tags, tag]); };

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error(t("pleaseEnterRecipeName")); return; }
    const validIngredients = ingredients.filter((ing) => ing.name.trim());
    const validSteps = steps.filter((step) => step.description.trim());
    if (validIngredients.length === 0) { toast.error(t("pleaseAddIngredient")); return; }
    if (validSteps.length === 0) { toast.error(t("pleaseAddStep")); return; }

    try {
      setIsSubmitting(true);
      let finalImages = [...images];
      if (images.some((img) => img.startsWith("blob:"))) {
        setIsUploadingImages(true);
        const resolved: string[] = [];
        for (const img of images) {
          if (img.startsWith("blob:")) {
            const file = blobFileMap.get(img);
            if (!file) throw new Error("Image file not found");
            resolved.push(await uploadImageFile(file));
          } else {
            resolved.push(img);
          }
        }
        finalImages = resolved;
        setIsUploadingImages(false);
      }

      const newRecipe: Omit<Recipe, "id" | "createdAt" | "updatedAt"> = {
        title: title.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        servings: parseInt(servings) || 4,
        prepTime: parseInt(prepTime) || undefined,
        cookTime: parseInt(cookTime) || undefined,
        ingredients: validIngredients,
        steps: validSteps.map((s, i) => ({ ...s, number: i + 1 })),
        notes: notes.trim() || undefined,
        sourceUrl: sourceUrl.trim() || undefined,
        imageUrl: finalImages[0] || undefined,
        images: finalImages.length > 0 ? finalImages : undefined,
        isFavorite: false,
      };

      await addRecipe(newRecipe);
      toast.success(t("recipeCreated"));
      handleReset();
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error(t("errorCreatingRecipe"));
    } finally {
      setIsSubmitting(false);
      setIsUploadingImages(false);
    }
  };

  const handleReset = () => {
    setTitle(""); setDescription(""); setCategory(""); setTags([]); setTagInput("");
    setServings("4"); setPrepTime(""); setCookTime("");
    images.forEach((img) => { if (img.startsWith("blob:")) URL.revokeObjectURL(img); });
    setImages([]); setBlobFileMap(new Map()); setCurrentImageIndex(0);
    setIngredients([{ id: nanoid(), name: "", amount: 0, unit: "g" }]);
    setSteps([{ id: nanoid(), number: 1, description: "" }]);
    setNotes(""); setSourceUrl("");
  };

  const UNITS = ["g", "ml", "l", "tbsp", "tsp", "cup", "piece", "kg", "oz", "lb", "bunch", "slice"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 flex flex-col max-h-[92vh] rounded-2xl overflow-hidden bg-zinc-50 dark:bg-zinc-950" showCloseButton={false}>
        {/* ── Sticky Header ── */}
        <div className="flex items-center justify-between px-5 py-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.08] flex-shrink-0">
          <button
            onClick={() => onOpenChange(false)}
            className="text-sm text-primary font-medium hover:opacity-70 transition-opacity"
          >
            {t("cancel")}
          </button>
          <h2 className="text-base font-semibold text-foreground">{t("createNewRecipe")}</h2>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="text-sm text-primary font-semibold hover:opacity-70 transition-opacity disabled:opacity-40 flex items-center gap-1"
          >
            {isSubmitting ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" />{isUploadingImages ? t("uploading") : t("saving")}</>
            ) : (
              t("createRecipe")
            )}
          </button>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">

          {/* Image Upload */}
          <SectionTitle>{t("addImages")}</SectionTitle>
          <div className="rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08]">
            {images.length > 0 ? (
              <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
                <img
                  src={images[currentImageIndex]}
                  alt={`Preview ${currentImageIndex + 1}`}
                  className="w-full h-full object-cover"
                />
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentImageIndex((i) => (i - 1 + images.length) % images.length)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 backdrop-blur-sm transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentImageIndex((i) => (i + 1) % images.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 backdrop-blur-sm transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {images.map((_, i) => (
                        <button key={i} onClick={() => setCurrentImageIndex(i)}
                          className={`w-1.5 h-1.5 rounded-full transition-colors ${i === currentImageIndex ? "bg-white" : "bg-white/50"}`}
                        />
                      ))}
                    </div>
                  </>
                )}
                <button
                  onClick={() => handleRemoveImage(currentImageIndex)}
                  className="absolute top-2 right-2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 backdrop-blur-sm transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="absolute top-2 left-2 bg-black/40 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">
                  {currentImageIndex + 1} / {images.length}
                </div>
              </div>
            ) : null}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground hover:text-foreground hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
            >
              <ImagePlus className="w-5 h-5" />
              {images.length > 0 ? `${images.length} ${t("imageCount")} — ${t("addImages")}` : t("addImagesHint")}
            </button>
            {images.length > 1 && (
              <div className="flex gap-2 px-3 pb-3 overflow-x-auto">
                {images.map((src, i) => (
                  <button key={i} onClick={() => setCurrentImageIndex(i)}
                    className={`relative flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-colors ${i === currentImageIndex ? "border-primary" : "border-transparent"}`}
                  >
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => handleFilesSelected(e.target.files)} />

          {/* Basic Info */}
          <SectionTitle>{t("basicInfo")}</SectionTitle>
          <FieldGroup>
            <Field label={`${t("recipeName")} *`}>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("recipeNamePlaceholder")}
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none py-1"
              />
            </Field>
            <Field label={t("description")}>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("descriptionPlaceholder")}
                rows={4}
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none py-1"
              />
            </Field>
            <Field label={t("category")}>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder={t("newCategory") || "z.B. Frühstück"}
                list="category-suggestions"
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none py-1"
              />
              <datalist id="category-suggestions">
                {existingCategories.map((cat) => <option key={cat} value={cat} />)}
              </datalist>
            </Field>
          </FieldGroup>

          {/* Time & Servings */}
          <SectionTitle>{t("portions")} & {t("time")}</SectionTitle>
          <FieldGroup>
            <Field label={t("portions")}>
              <input
                type="number" min="1" value={servings}
                onChange={(e) => setServings(e.target.value)}
                className="w-full bg-transparent text-sm text-foreground outline-none py-1"
              />
            </Field>
            <Field label={t("prepTime")} suffix={t("min")}>
              <input
                type="number" min="0" value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
                placeholder="0"
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none py-1"
              />
            </Field>
            <Field label={t("cookingTime")} suffix={t("min")}>
              <input
                type="number" min="0" value={cookTime}
                onChange={(e) => setCookTime(e.target.value)}
                placeholder="0"
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none py-1"
              />
            </Field>
          </FieldGroup>

          {/* Tags */}
          <SectionTitle>{t("tags")}</SectionTitle>
          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] overflow-hidden">
            {existingTags.length > 0 && (
              <div className="px-4 pt-3 pb-2 flex flex-wrap gap-1.5">
                {existingTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleAddExistingTag(tag)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      tags.includes(tag)
                        ? "bg-primary text-primary-foreground"
                        : "bg-black/[0.05] dark:bg-white/[0.08] text-foreground/70 hover:bg-black/[0.08]"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 px-4 py-3 border-t border-black/[0.06] dark:border-white/[0.08]">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                placeholder={t("addTag")}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              <button onClick={handleAddTag}
                className="w-6 h-6 rounded-full bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center transition-colors">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            {tags.length > 0 && (
              <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span key={tag} className="flex items-center gap-1 px-2.5 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
                    {tag}
                    <button onClick={() => handleRemoveTag(tag)} className="hover:opacity-70">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Ingredients */}
          <SectionTitle>{t("ingredients")} *</SectionTitle>
          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] overflow-hidden divide-y divide-black/[0.06] dark:divide-white/[0.08]">
            {ingredients.map((ingredient, idx) => (
              <div key={ingredient.id} className="grid items-center gap-0 px-3 py-2.5" style={{ gridTemplateColumns: '20px 64px 72px 1fr 20px' }}>
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold flex items-center justify-center">
                  {idx + 1}
                </span>
                <input
                  type="number"
                  placeholder="0"
                  value={ingredient.amount || ""}
                  onChange={(e) => handleUpdateIngredient(ingredient.id, "amount", parseFloat(e.target.value) || 0)}
                  className="w-full bg-transparent text-sm text-foreground text-right outline-none pr-1"
                />
                <select
                  value={ingredient.unit}
                  onChange={(e) => handleUpdateIngredient(ingredient.id, "unit", e.target.value)}
                  className="bg-transparent text-sm text-muted-foreground outline-none cursor-pointer px-1"
                >
                  {UNITS.map((u) => <option key={u} value={u}>{fu(u)}</option>)}
                </select>
                <input
                  placeholder={t("ingredientPlaceholder")}
                  value={ingredient.name}
                  onChange={(e) => handleUpdateIngredient(ingredient.id, "name", e.target.value)}
                  className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none pl-2 min-w-0"
                />
                <button onClick={() => handleRemoveIngredient(ingredient.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors flex justify-end">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <button onClick={handleAddIngredient}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-primary hover:bg-primary/[0.03] transition-colors">
              <Plus className="w-4 h-4" />
              {t("addIngredient")}
            </button>
          </div>

          {/* Steps */}
          <SectionTitle>{t("instructions")} *</SectionTitle>
          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] overflow-hidden divide-y divide-black/[0.06] dark:divide-white/[0.08]">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-start gap-3 px-3 py-3">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {index + 1}
                </span>
                <textarea
                  placeholder={t("stepDescription")}
                  value={step.description}
                  onChange={(e) => handleUpdateStep(step.id, e.target.value)}
                  rows={2}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none"
                />
                <button onClick={() => handleRemoveStep(step.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 mt-0.5">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <button onClick={handleAddStep}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-primary hover:bg-primary/[0.03] transition-colors">
              <Plus className="w-4 h-4" />
              {t("addStep")}
            </button>
          </div>

          {/* Notes */}
          <SectionTitle>{t("notes")}</SectionTitle>
          <FieldGroup>
            <Field label={t("notes")}>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("notesPlaceholder")}
                rows={3}
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none py-1"
              />
            </Field>
            <Field label={t("sourceUrl")}>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder={t("sourceUrlPlaceholder")}
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none py-1"
              />
            </Field>
          </FieldGroup>

          {/* Bottom padding */}
          <div className="h-4" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
