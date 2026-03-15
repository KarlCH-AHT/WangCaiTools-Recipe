import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { useRecipes, getAllTags } from "@/features/recipes";
import { useTranslation } from "@/hooks/useTranslation";
import { Recipe } from "@/types/recipe";
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { ingredientsToText, parseIngredientsText, parseStepsText, sanitizeLegacyNoteText, stepsToText } from "@/utils/recipeLineEditors";

interface AddRecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{children}</h3>;
}

function PlainEditorDialog({
  open,
  onOpenChange,
  title,
  value,
  onChange,
  placeholder,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-2xl p-0" showCloseButton={false}>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <button onClick={() => onOpenChange(false)} className="text-sm text-primary">完成</button>
          <h3 className="text-sm font-semibold">{title}</h3>
          <span className="w-8" />
        </div>
        <div className="p-4">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="min-h-[360px] w-full resize-y rounded-xl border bg-zinc-50 p-3 text-sm leading-7 outline-none focus:ring-2 focus:ring-zinc-300 dark:bg-zinc-900"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AddRecipeDialog({ open, onOpenChange }: AddRecipeDialogProps) {
  const { addRecipe, recipes } = useRecipes();
  const t = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
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

  const [ingredientsText, setIngredientsText] = useState("");
  const [stepsText, setStepsText] = useState("");
  const [notesText, setNotesText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  const [ingredientsOpen, setIngredientsOpen] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const existingCategories = useMemo(() => {
    const cats = new Set<string>();
    recipes.forEach((r) => {
      if (r.category) cats.add(r.category);
    });
    return Array.from(cats).sort();
  }, [recipes]);

  const existingTags = getAllTags(recipes);

  useEffect(() => {
    if (!open) return;
    const generatedRecipe = sessionStorage.getItem("generatedRecipe");
    if (!generatedRecipe) return;
    try {
      const recipe = JSON.parse(generatedRecipe);
      setTitle(recipe.title || "");
      setCategory(recipe.category || "");
      setServings(String(recipe.servings || 4));
      setPrepTime(String(recipe.prepTime || ""));
      setCookTime(String(recipe.cookTime || ""));
      setTags([]);
      setIngredientsText(ingredientsToText(recipe.ingredients || []));
      setStepsText(stepsToText(recipe.steps || []));
      setNotesText(sanitizeLegacyNoteText(recipe.notes || ""));
      setSourceUrl(recipe.sourceUrl || "");
      if (recipe.imageUrl) {
        setImages([recipe.imageUrl]);
        setCurrentImageIndex(0);
      } else if (recipe.images?.length > 0) {
        setImages(recipe.images);
        setCurrentImageIndex(0);
      }
      sessionStorage.removeItem("generatedRecipe");
    } catch {
      // ignore parse error
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
      setBlobFileMap((prev) => {
        const next = new Map(prev);
        next.set(previewUrl, file);
        return next;
      });
      setImages((prev) => {
        const next = [...prev, previewUrl];
        setCurrentImageIndex(next.length - 1);
        return next;
      });
    });
  };

  const handleRemoveImage = (idx: number) => {
    setImages((prev) => {
      const removed = prev[idx];
      if (removed?.startsWith("blob:")) {
        URL.revokeObjectURL(removed);
        setBlobFileMap((m) => {
          const next = new Map(m);
          next.delete(removed);
          return next;
        });
      }
      const next = prev.filter((_, i) => i !== idx);
      setCurrentImageIndex(Math.min(currentImageIndex, Math.max(0, next.length - 1)));
      return next;
    });
  };

  const handleAddTag = () => {
    const next = tagInput.trim();
    if (next && !tags.includes(next)) {
      setTags([...tags, next]);
      setTagInput("");
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error(t("pleaseEnterRecipeName"));
      return;
    }

    const parsedIngredients = parseIngredientsText(ingredientsText);
    const parsedSteps = parseStepsText(stepsText);

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
        category: category.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        servings: parseInt(servings) || 4,
        prepTime: parseInt(prepTime) || undefined,
        cookTime: parseInt(cookTime) || undefined,
        ingredients: parsedIngredients,
        steps: parsedSteps,
        notes: notesText.trim() || undefined,
        sourceUrl: sourceUrl.trim() || undefined,
        imageUrl: finalImages[0] || undefined,
        images: finalImages.length > 0 ? finalImages : undefined,
        isFavorite: false,
      };

      await addRecipe(newRecipe);
      toast.success(t("recipeCreated"));
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("errorCreatingRecipe"));
    } finally {
      setIsSubmitting(false);
      setIsUploadingImages(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl rounded-3xl p-0" showCloseButton={false}>
          <div className="flex items-center justify-between border-b px-5 py-4">
            <button onClick={() => onOpenChange(false)} className="text-sm font-medium text-primary">{t("cancel")}</button>
            <h2 className="text-base font-semibold">{t("createNewRecipe")}</h2>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="text-sm font-semibold text-primary disabled:opacity-40"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-1"><Loader2 className="h-3.5 w-3.5 animate-spin" />{isUploadingImages ? t("uploading") : t("saving")}</span>
              ) : t("createRecipe")}
            </button>
          </div>

          <div className="max-h-[80vh] space-y-4 overflow-y-auto px-4 py-4">
            <div className="rounded-2xl border bg-white p-3 dark:bg-zinc-900">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("recipeNamePlaceholder")}
                className="w-full bg-transparent text-base font-medium outline-none"
              />
            </div>

            <div className="rounded-2xl border bg-white p-3 dark:bg-zinc-900 space-y-3">
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder={t("newCategory") || "分类"}
                className="w-full rounded-xl border bg-zinc-50 px-3 py-2 text-sm outline-none"
              />
              {existingCategories.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {existingCategories.slice(0, 10).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                        category === cat
                          ? "bg-primary text-primary-foreground"
                          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="grid grid-cols-3 gap-2">
                <input type="number" min="1" value={servings} onChange={(e) => setServings(e.target.value)} placeholder={t("portions")} className="rounded-xl border bg-zinc-50 px-3 py-2 text-sm" />
                <input type="number" min="0" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} placeholder={t("prepTime")} className="rounded-xl border bg-zinc-50 px-3 py-2 text-sm" />
                <input type="number" min="0" value={cookTime} onChange={(e) => setCookTime(e.target.value)} placeholder={t("cookingTime")} className="rounded-xl border bg-zinc-50 px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-3 dark:bg-zinc-900">
              <SectionTitle>{t("tags")}</SectionTitle>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span key={tag} className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary">
                    {tag}
                    <button onClick={() => setTags(tags.filter((t) => t !== tag))}><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} className="flex-1 rounded-xl border bg-zinc-50 px-3 py-2 text-sm" placeholder={t("addTag")} />
                <button onClick={handleAddTag} className="rounded-xl border px-3 py-2 text-sm">+ </button>
              </div>
              {existingTags.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {existingTags.slice(0, 12).map((tag) => (
                    <button key={tag} onClick={() => !tags.includes(tag) && setTags([...tags, tag])} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs">
                      {tag}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border bg-white p-3 dark:bg-zinc-900 space-y-2">
              <button onClick={() => setIngredientsOpen(true)} className="w-full rounded-xl border px-3 py-3 text-left text-sm">食材（{parseIngredientsText(ingredientsText).length}）</button>
              <button onClick={() => setStepsOpen(true)} className="w-full rounded-xl border px-3 py-3 text-left text-sm">步骤（{parseStepsText(stepsText).length}）</button>
              <button onClick={() => setNotesOpen(true)} className="w-full rounded-xl border px-3 py-3 text-left text-sm">Note（{notesText.trim() ? "已填写" : "空"}）</button>
            </div>

            <div className="rounded-2xl border bg-white p-3 dark:bg-zinc-900 space-y-2">
              <SectionTitle>{t("addImages")}</SectionTitle>
              {images.length > 0 ? (
                <div className="relative w-full overflow-hidden rounded-xl" style={{ aspectRatio: "16/9" }}>
                  <img src={images[currentImageIndex]} alt="Preview" className="h-full w-full object-cover" />
                  {images.length > 1 ? (
                    <>
                      <button onClick={() => setCurrentImageIndex((i) => (i - 1 + images.length) % images.length)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white"><ChevronLeft className="h-4 w-4" /></button>
                      <button onClick={() => setCurrentImageIndex((i) => (i + 1) % images.length)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white"><ChevronRight className="h-4 w-4" /></button>
                    </>
                  ) : null}
                  <button onClick={() => handleRemoveImage(currentImageIndex)} className="absolute right-2 top-2 rounded-full bg-black/40 p-1 text-white"><X className="h-3.5 w-3.5" /></button>
                </div>
              ) : null}
              <button onClick={() => fileInputRef.current?.click()} className="w-full rounded-xl border px-3 py-2 text-sm">
                <span className="inline-flex items-center gap-2"><ImagePlus className="h-4 w-4" /> {images.length > 0 ? `${images.length} ${t("imageCount")}` : t("addImagesHint")}</span>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFilesSelected(e.target.files)} />
            </div>

            <div className="rounded-2xl border bg-white p-3 dark:bg-zinc-900">
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder={t("sourceUrlPlaceholder")}
                className="w-full rounded-xl border bg-zinc-50 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PlainEditorDialog
        open={ingredientsOpen}
        onOpenChange={setIngredientsOpen}
        title="编辑食材"
        value={ingredientsText}
        onChange={setIngredientsText}
        placeholder={"每行一条食材，例如:\n200 g Mehl\n1x Eigelb + 1 EL Wasser\n酱汁:\n生抽 2勺"}
      />
      <PlainEditorDialog
        open={stepsOpen}
        onOpenChange={setStepsOpen}
        title="编辑步骤"
        value={stepsText}
        onChange={setStepsText}
        placeholder={"每行一步，例如:\n210 Grad vorheizen\n12 Min backen"}
      />
      <PlainEditorDialog
        open={notesOpen}
        onOpenChange={setNotesOpen}
        title="编辑 Note"
        value={notesText}
        onChange={setNotesText}
        placeholder={"记录正常文字备注"}
      />
    </>
  );
}
