import { create } from "zustand";
import type { EditorBlock, RecipeEditorState } from "@/types/recipe";
import { detectBlockType } from "@/utils/blockDetection";
import { parseIngredientLine } from "@/utils/ingredientParser";
import { parseEditorDocToRecipeJSON } from "@/utils/recipeSerializer";

interface RecipeEditorStore extends RecipeEditorState {
  setTitle: (title: string) => void;
  setServings: (servings: number) => void;
  setBlocks: (blocks: EditorBlock[]) => void;
  updateBlockText: (id: string, text: string) => void;
  addBlockAfter: (id: string) => string;
  removeBlockAndMergePrevious: (id: string) => void;
  reorderSteps: (activeId: string, overId: string) => void;
  syncSerialized: () => void;
}

const defaultBlock: EditorBlock = { id: crypto.randomUUID(), type: "paragraph", text: "" };

function toStructuredBlock(block: EditorBlock, text: string): EditorBlock {
  const trimmed = text.trim();
  if (!trimmed) return { ...block, type: "paragraph", text };

  const detected = detectBlockType(trimmed);

  if (detected === "section") {
    const sectionText = /[:：]\s*$/.test(trimmed) ? trimmed : `${trimmed}:`;
    return { id: block.id, type: "section", text: sectionText };
  }

  if (detected === "step") {
    const match = trimmed.match(/^(\d+)\.\s*(.*)$/);
    const index = Number(match?.[1] ?? 1);
    const content = match?.[2]?.trim() ?? trimmed;
    return { id: block.id, type: "step", raw: trimmed, index, text: content };
  }

  if (detected === "ingredient") {
    const parsed = parseIngredientLine(trimmed);
    if (parsed) {
      return {
        id: block.id,
        type: "ingredient",
        raw: trimmed,
        name: parsed.name,
        amount: parsed.amount,
        unit: parsed.unit,
        note: parsed.note,
      };
    }
  }

  return { id: block.id, type: "note", text: trimmed };
}

function normalizeStepIndexes(blocks: EditorBlock[]): EditorBlock[] {
  let idx = 1;
  return blocks.map((block) => {
    if (block.type !== "step") return block;
    return { ...block, index: idx++, raw: `${idx - 1}. ${block.text}` };
  });
}

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export const useRecipeEditorStore = create<RecipeEditorStore>((set, get) => ({
  title: "",
  servings: 2,
  sections: [],
  steps: [],
  notes: [],
  rawDoc: [defaultBlock],

  setTitle: (title) => set({ title }),
  setServings: (servings) => set({ servings }),

  setBlocks: (blocks) => {
    const normalized = normalizeStepIndexes(blocks);
    const serialized = parseEditorDocToRecipeJSON(normalized);
    set({
      rawDoc: normalized,
      sections: serialized.sections,
      steps: serialized.steps,
      notes: serialized.notes,
    });
  },

  updateBlockText: (id, text) => {
    const next = get().rawDoc.map((block) =>
      block.id === id ? toStructuredBlock(block, text) : block,
    );
    const normalized = normalizeStepIndexes(next);
    const serialized = parseEditorDocToRecipeJSON(normalized);
    set({
      rawDoc: normalized,
      sections: serialized.sections,
      steps: serialized.steps,
      notes: serialized.notes,
    });
  },

  addBlockAfter: (id) => {
    const newId = crypto.randomUUID();
    const nextBlock: EditorBlock = { id: newId, type: "paragraph", text: "" };
    const blocks = get().rawDoc;
    const idx = blocks.findIndex((block) => block.id === id);
    const inserted = [...blocks];
    inserted.splice(idx + 1, 0, nextBlock);
    set({ rawDoc: inserted });
    get().syncSerialized();
    return newId;
  },

  removeBlockAndMergePrevious: (id) => {
    const blocks = get().rawDoc;
    if (blocks.length <= 1) return;
    const idx = blocks.findIndex((block) => block.id === id);
    if (idx <= 0) return;

    const current = blocks[idx];
    const isEmpty =
      (current.type === "ingredient" && !current.raw.trim()) ||
      ((current.type === "section" || current.type === "note" || current.type === "paragraph") &&
        !current.text.trim()) ||
      (current.type === "step" && !current.text.trim());

    if (!isEmpty) return;

    const next = blocks.filter((block) => block.id !== id);
    set({ rawDoc: next });
    get().syncSerialized();
  },

  reorderSteps: (activeId, overId) => {
    const blocks = get().rawDoc;
    const stepPositions = blocks
      .map((block, index) => ({ block, index }))
      .filter(({ block }) => block.type === "step");

    const from = stepPositions.findIndex(({ block }) => block.id === activeId);
    const to = stepPositions.findIndex(({ block }) => block.id === overId);
    if (from < 0 || to < 0 || from === to) return;

    const reorderedSteps = arrayMove(stepPositions, from, to);
    const byId = new Map(reorderedSteps.map((item, index) => [item.block.id, { ...item.block, index }]));

    const merged = blocks.map((block) => {
      const replaced = byId.get(block.id);
      return replaced ? (replaced as EditorBlock) : block;
    });

    const onlySteps = merged.filter((b): b is Extract<EditorBlock, { type: "step" }> => b.type === "step");
    const stepMap = new Map(onlySteps.map((s, i) => [s.id, { ...s, index: i + 1, raw: `${i + 1}. ${s.text}` }]));

    const next = merged.map((block) => (block.type === "step" ? (stepMap.get(block.id) as EditorBlock) : block));
    const serialized = parseEditorDocToRecipeJSON(next);
    set({ rawDoc: next, sections: serialized.sections, steps: serialized.steps, notes: serialized.notes });
  },

  syncSerialized: () => {
    const normalized = normalizeStepIndexes(get().rawDoc);
    const serialized = parseEditorDocToRecipeJSON(normalized);
    set({
      rawDoc: normalized,
      sections: serialized.sections,
      steps: serialized.steps,
      notes: serialized.notes,
    });
  },
}));
