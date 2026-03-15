import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Link, Loader2 } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useRecipes } from "@/contexts/RecipeContext";
import { trpc } from "@/lib/trpc";
import { importRecipesFromJSON, importRecipesFromCSV } from "@/lib/recipeImport";
import { toast } from "sonner";

interface ImportRecipeDialogProps {
  /** Controlled open state – when provided the dialog is fully controlled */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onOpenAddDialog?: (prefillData: any) => void;
}

export default function ImportRecipeDialog({
  open,
  onOpenChange,
  onOpenAddDialog,
}: ImportRecipeDialogProps) {
  const t = useTranslation();
  const { addRecipe } = useRecipes();
  const [loading, setLoading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);

  const importFromUrlMutation = trpc.recipes.importFromUrl.useMutation();

  const handleClose = () => {
    onOpenChange?.(false);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const content = await file.text();
      let recipes = [];

      if (file.name.endsWith(".json")) {
        recipes = importRecipesFromJSON(content);
      } else if (file.name.endsWith(".csv")) {
        recipes = importRecipesFromCSV(content);
      } else {
        throw new Error("Unsupported file format. Please use JSON or CSV.");
      }

      await Promise.all(recipes.map((recipe) => addRecipe(recipe)));

      toast.success(`成功导入 ${recipes.length} 道菜谱`);
      handleClose();
    } catch (error) {
      console.error("Import error:", error);
      toast.error(
        error instanceof Error ? error.message : "导入失败，请检查文件格式"
      );
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  const handleUrlImport = async () => {
    const url = urlInput.trim();
    if (!url) {
      toast.error(t("pasteUrl") || "请输入 URL");
      return;
    }

    try {
      new URL(url);
    } catch {
      toast.error("请输入有效的 URL");
      return;
    }

    setIsFetchingUrl(true);
    try {
      const result = await importFromUrlMutation.mutateAsync({ url });
      if (result.success && result.recipe) {
        sessionStorage.setItem("generatedRecipe", JSON.stringify(result.recipe));
        handleClose();
        setUrlInput("");
        if (onOpenAddDialog) {
          onOpenAddDialog(result.recipe);
        }
        toast.success(t("importAndEdit") || "导入成功，请编辑菜谱");
      }
    } catch (error) {
      console.error("URL import error:", error);
      toast.error(
        error instanceof Error ? error.message : t("failedToImportUrl") || "URL 导入失败"
      );
    } finally {
      setIsFetchingUrl(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("importRecipes") || "导入菜谱"}</DialogTitle>
          <DialogDescription>
            {t("importFromUrlDesc") || "从网址导入菜谱，或上传 JSON / CSV 文件"}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="url" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="url" className="gap-2">
              <Link className="w-4 h-4" />
              {t("importFromUrl") || "从网址导入"}
            </TabsTrigger>
            <TabsTrigger value="file" className="gap-2">
              <Upload className="w-4 h-4" />
              {t("importRecipes") || "上传文件"}
            </TabsTrigger>
          </TabsList>

          {/* URL Import Tab */}
          <TabsContent value="url" className="space-y-4 mt-4">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t("importFromUrlDesc") || "粘贴菜谱页面的网址，AI 将自动提取菜谱内容"}
              </p>
              <Input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder={t("pasteUrlPlaceholder") || "https://example.com/recipe/..."}
                type="url"
                onKeyDown={(e) => e.key === "Enter" && handleUrlImport()}
                disabled={isFetchingUrl}
              />
              <Button
                onClick={handleUrlImport}
                disabled={isFetchingUrl || !urlInput.trim()}
                className="w-full gap-2"
              >
                {isFetchingUrl ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t("fetchingRecipe") || "正在获取菜谱…"}
                  </>
                ) : (
                  <>
                    <Link className="w-4 h-4" />
                    {t("importAndEdit") || "导入并编辑"}
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* File Import Tab */}
          <TabsContent value="file" className="mt-4">
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
              <input
                type="file"
                accept=".json,.csv"
                onChange={handleFileSelect}
                disabled={loading}
                className="hidden"
                id="recipe-import"
              />
              <label htmlFor="recipe-import" className="cursor-pointer">
                <div className="text-4xl mb-3">📁</div>
                <p className="font-medium text-foreground">
                  {loading ? "导入中…" : "点击选择文件"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  支持 JSON 或 CSV 格式
                </p>
              </label>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
