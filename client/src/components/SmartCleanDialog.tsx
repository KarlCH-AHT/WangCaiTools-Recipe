import { useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { EditorBlock, SerializedRecipeData } from "@/types/recipe";
import {
  mockSmartCleanupApiClient,
  serializedToBlocks,
  smartCleanRecipeContent,
  type SmartCleanupApiClient,
} from "@/utils/aiSmartCleanup";

interface SmartCleanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blocks: EditorBlock[];
  onApply: (blocks: EditorBlock[], serialized: SerializedRecipeData) => void;
  apiClient?: SmartCleanupApiClient;
}

export function SmartCleanDialog({
  open,
  onOpenChange,
  blocks,
  onApply,
  apiClient = mockSmartCleanupApiClient,
}: SmartCleanDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<SerializedRecipeData | null>(null);

  const canRun = useMemo(
    () =>
      blocks.some((block) => {
        if (block.type === "ingredient") return Boolean(block.raw.trim());
        if (block.type === "step") return Boolean(block.raw.trim() || block.text.trim());
        return Boolean(block.text.trim());
      }),
    [blocks],
  );

  const handleRun = async () => {
    try {
      setLoading(true);
      setError(null);
      const cleaned = await smartCleanRecipeContent({ blocks, apiClient });
      setPreview(cleaned);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Smart cleanup failed";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!preview) return;
    onApply(serializedToBlocks(preview), preview);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Smart Clean Recipe
          </DialogTitle>
          <DialogDescription>
            AI will normalize ingredient units, repair step ordering, and group content into structured sections.
          </DialogDescription>
        </DialogHeader>

        {!preview ? (
          <div className="rounded-lg border bg-zinc-50 p-3 text-sm text-muted-foreground dark:bg-zinc-900">
            {canRun ? "Ready to analyze your current editor content." : "Add some content before running smart clean."}
          </div>
        ) : (
          <pre className="max-h-[420px] overflow-auto rounded-lg border bg-zinc-50 p-3 text-xs dark:bg-zinc-900">
            {JSON.stringify(preview, null, 2)}
          </pre>
        )}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {!preview ? (
            <Button onClick={handleRun} disabled={loading || !canRun}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Generate Preview
            </Button>
          ) : (
            <Button onClick={handleApply}>Apply Cleaned Content</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
