import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export interface GeneratedRecipeData {
  title: string;
  description: string;
  category: string;
  servings: number;
  prepTime: number;
  cookTime: number;
  ingredients: { name: string; amount: number; unit: string }[];
  steps: { number: number; description: string }[];
  tags: string[];
}

interface AIGenerateRecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated: (recipe: GeneratedRecipeData) => void;
}

export default function AIGenerateRecipeDialog({
  open,
  onOpenChange,
  onGenerated,
}: AIGenerateRecipeDialogProps) {
  const t = useTranslation();
  const [dishName, setDishName] = useState("");
  const [servings, setServings] = useState("4");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const generateMutation = trpc.recipes.generateWithAI.useMutation({
    onSuccess: (data) => {
      setIsLoading(false);
      if (data.success && data.recipe) {
        // Pass generated data to parent via callback
        onGenerated(data.recipe as GeneratedRecipeData);
        onOpenChange(false);
        // Reset form
        setDishName("");
        setServings("4");
        setDescription("");
      }
    },
    onError: (error) => {
      setIsLoading(false);
      console.error("Failed to generate recipe:", error);
      const message =
        error.message ||
        (t("failedToGenerateRecipe") || "Failed to generate recipe");
      toast.error(message);
    },
  });

  const handleGenerate = async () => {
    if (!dishName.trim()) {
      toast.error(t("pleaseEnterDishName") || "Please enter a dish name");
      return;
    }

    setIsLoading(true);
    generateMutation.mutate({
      dishName: dishName.trim(),
      servings: parseInt(servings) || 4,
      description: description.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {t("generateRecipeWithAI") || "Generate Recipe with AI"}
          </DialogTitle>
          <DialogDescription>
            {t("generateRecipeDescription") ||
              "Enter dish details and let AI create a recipe for you"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Dish Name */}
          <div className="space-y-2">
            <Label htmlFor="dishName">{t("dishName") || "Dish Name"}</Label>
            <Input
              id="dishName"
              placeholder={t("enterDishName") || "e.g., Red Braised Pork"}
              value={dishName}
              onChange={(e) => setDishName(e.target.value)}
              disabled={isLoading}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            />
          </div>

          {/* Servings */}
          <div className="space-y-2">
            <Label htmlFor="servings">{t("servings") || "Servings"}</Label>
            <Input
              id="servings"
              type="number"
              min="1"
              max="20"
              value={servings}
              onChange={(e) => setServings(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              {t("description") || "Description (Optional)"}
            </Label>
            <Textarea
              id="description"
              placeholder={
                t("enterDescription") ||
                "e.g., Soft and tender, sweet and salty taste"
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading}
              rows={3}
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {t("cancel")}
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isLoading || !dishName.trim()}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoading
              ? t("generating") || "Generating..."
              : t("generate") || "Generate"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
