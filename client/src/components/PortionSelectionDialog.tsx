import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/hooks/useTranslation";

interface PortionSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipeName: string;
  defaultServings: number;
  onConfirm: (servings: number) => void;
}

const PORTION_PRESETS = [
  { label: "half", value: 0.5 },
  { label: "threeFourths", value: 0.75 },
  { label: "normal", value: 1 },
  { label: "oneAndHalf", value: 1.5 },
  { label: "double", value: 2 },
];

export default function PortionSelectionDialog({
  open,
  onOpenChange,
  recipeName,
  defaultServings,
  onConfirm,
}: PortionSelectionDialogProps) {
  const t = useTranslation();
  const [selectedMultiplier, setSelectedMultiplier] = useState(1);
  const [customMultiplier, setCustomMultiplier] = useState("");

  const handleConfirm = () => {
    const multiplier =
      customMultiplier && parseFloat(customMultiplier) > 0
        ? parseFloat(customMultiplier)
        : selectedMultiplier;

    const finalServings = defaultServings * multiplier;
    onConfirm(finalServings);
    onOpenChange(false);
    setSelectedMultiplier(1);
    setCustomMultiplier("");
  };

  const currentServings =
    customMultiplier && parseFloat(customMultiplier) > 0
      ? (defaultServings * parseFloat(customMultiplier)).toFixed(1)
      : (defaultServings * selectedMultiplier).toFixed(1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("selectPortions")}</DialogTitle>
          <DialogDescription>
            {t("selectPortionsBeforeCooking")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Recipe Name */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-foreground">
              {recipeName}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t("portionsFor")}: <span className="font-semibold">{currentServings}</span>
            </p>
          </div>

          {/* Portion Presets */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              {t("selectPortions")}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PORTION_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  variant={selectedMultiplier === preset.value ? "default" : "outline"}
                  onClick={() => {
                    setSelectedMultiplier(preset.value);
                    setCustomMultiplier("");
                  }}
                  className={
                    selectedMultiplier === preset.value
                      ? "bg-primary text-primary-foreground"
                      : ""
                  }
                >
                  {preset.value === 1
                    ? t(preset.label)
                    : `${preset.value}x`}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Multiplier */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {t("customMultiplier") || "Custom multiplier"}
            </label>
            <Input
              type="number"
              step="0.25"
              min="0.25"
              placeholder="z.B. 1.25"
              value={customMultiplier}
              onChange={(e) => {
                setCustomMultiplier(e.target.value);
                if (e.target.value) {
                  setSelectedMultiplier(1);
                }
              }}
              className="text-center"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {t("confirm")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
