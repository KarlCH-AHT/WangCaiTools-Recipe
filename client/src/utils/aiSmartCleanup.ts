import { z } from "zod";
import type { EditorBlock, SerializedRecipeData } from "@/types/recipe";

const ingredientSchema = z.object({
  name: z.string().min(1),
  amount: z.number().nullable(),
  unit: z.string().nullable(),
  note: z.string().optional(),
});

const stepSchema = z.object({
  index: z.number().int().min(1),
  text: z.string().min(1),
});

export const smartCleanupResponseSchema = z.object({
  sections: z.array(
    z.object({
      title: z.string().min(1),
      ingredients: z.array(ingredientSchema),
    }),
  ),
  steps: z.array(stepSchema),
  notes: z.array(z.string()),
});

export type SmartCleanupResponse = z.infer<typeof smartCleanupResponseSchema>;

export interface SmartCleanupApiClient {
  cleanupRecipe: (payload: { rawText: string; blocks: EditorBlock[] }) => Promise<unknown>;
}

export function toRawText(blocks: EditorBlock[]): string {
  return blocks
    .map((block) => {
      if (block.type === "section") return `${block.text.replace(/[:：]\s*$/, "")}:`;
      if (block.type === "ingredient") return block.raw;
      if (block.type === "step") return `${block.index}. ${block.text}`;
      return block.text;
    })
    .join("\n");
}

export function serializedToBlocks(data: SerializedRecipeData): EditorBlock[] {
  const blocks: EditorBlock[] = [];
  data.sections.forEach((section) => {
    blocks.push({ id: crypto.randomUUID(), type: "section", text: `${section.title}:` });
    section.ingredients.forEach((ingredient) => {
      const raw = [ingredient.name, ingredient.amount ?? "", ingredient.unit ?? "", ingredient.note ?? ""]
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      blocks.push({
        id: crypto.randomUUID(),
        type: "ingredient",
        raw,
        name: ingredient.name,
        amount: ingredient.amount,
        unit: ingredient.unit,
        note: ingredient.note,
      });
    });
  });

  data.steps
    .slice()
    .sort((a, b) => a.index - b.index)
    .forEach((step, idx) => {
      blocks.push({
        id: crypto.randomUUID(),
        type: "step",
        raw: `${idx + 1}. ${step.text}`,
        index: idx + 1,
        text: step.text,
      });
    });

  data.notes.forEach((note) => {
    if (!note.trim()) return;
    blocks.push({ id: crypto.randomUUID(), type: "note", text: note.trim() });
  });

  if (blocks.length === 0) {
    blocks.push({ id: crypto.randomUUID(), type: "paragraph", text: "" });
  }

  return blocks;
}

export async function smartCleanRecipeContent(params: {
  blocks: EditorBlock[];
  apiClient: SmartCleanupApiClient;
}): Promise<SmartCleanupResponse> {
  const { blocks, apiClient } = params;
  const response = await apiClient.cleanupRecipe({
    rawText: toRawText(blocks),
    blocks,
  });

  return smartCleanupResponseSchema.parse(response);
}

export const mockSmartCleanupApiClient: SmartCleanupApiClient = {
  async cleanupRecipe() {
    throw new Error("Smart cleanup API client is not connected yet.");
  },
};
