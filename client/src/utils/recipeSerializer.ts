import type { EditorBlock, SerializedRecipeData } from "@/types/recipe";

export function parseEditorDocToRecipeJSON(blocks: EditorBlock[]): SerializedRecipeData {
  const sections: SerializedRecipeData["sections"] = [];
  const steps: SerializedRecipeData["steps"] = [];
  const notes: string[] = [];

  let currentSectionIndex = -1;

  for (const block of blocks) {
    if (block.type === "section") {
      const title = block.text.replace(/[:：]\s*$/, "").trim();
      if (!title) continue;
      sections.push({ title, ingredients: [] });
      currentSectionIndex = sections.length - 1;
      continue;
    }

    if (block.type === "ingredient") {
      if (currentSectionIndex < 0) {
        sections.push({ title: "未分类", ingredients: [] });
        currentSectionIndex = 0;
      }
      sections[currentSectionIndex].ingredients.push({
        name: block.name,
        amount: block.amount,
        unit: block.unit,
        note: block.note,
      });
      continue;
    }

    if (block.type === "step") {
      steps.push({ index: block.index, text: block.text.trim() });
      continue;
    }

    if (block.type === "note" || block.type === "paragraph") {
      const text = block.text.trim();
      if (text) notes.push(text);
    }
  }

  const normalizedSteps = steps
    .filter((s) => s.text)
    .sort((a, b) => a.index - b.index)
    .map((step, i) => ({ index: i + 1, text: step.text }));

  return { sections, steps: normalizedSteps, notes };
}
