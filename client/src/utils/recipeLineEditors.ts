import { nanoid } from "nanoid";
import type { Ingredient, Step } from "@/types/recipe";
import { parseIngredientLine } from "@/utils/ingredientParser";

export const RAW_UNIT = "__raw__";

const normalize = (line: string) =>
  line
    .replace(/\uFF1A/g, ":")
    .replace(/\u3000/g, " ")
    .trim();

export const sanitizeLegacyNoteText = (text: string) => {
  if (!text) return "";
  if (text.includes("[NOTES]")) {
    return text.split("[NOTES]").slice(1).join("[NOTES]").trim();
  }
  if (text.includes("[INGREDIENTS_RAW]")) {
    return "";
  }
  return text.trim();
};

export function ingredientsToText(items: Ingredient[]): string {
  return (items ?? [])
    .map((ing) => {
      // Keep raw-like lines for section titles and free-text entries.
      if (ing.name.trim().endsWith(":") || ing.unit === RAW_UNIT || (!ing.amount && !ing.unit)) return ing.name;
      const prefix = ing.amount ? `${ing.amount}${ing.unit ? ` ${ing.unit}` : ""}` : ing.unit || "";
      return `${prefix} ${ing.name}`.trim();
    })
    .join("\n");
}

export function stepsToText(items: Step[]): string {
  return (items ?? [])
    .slice()
    .sort((a, b) => a.number - b.number)
    // Preserve original step content, do not rewrite numbering.
    .map((step) => step.description)
    .join("\n");
}

export function parseIngredientsText(text: string): Ingredient[] {
  const lines = text.split("\n").map(normalize).filter(Boolean);
  const result: Ingredient[] = [];

  lines.forEach((line) => {
    // Keep every ingredient line exactly as user typed.
    // We still probe parser for potential future use, but do not rewrite user content.
    parseIngredientLine(line);
    result.push({
      id: nanoid(),
      name: line,
      amount: 0,
      unit: RAW_UNIT,
    });
  });

  return result;
}

export function parseStepsText(text: string): Step[] {
  const lines = text.split("\n").map(normalize).filter(Boolean);
  return lines
    .map((line, idx) => {
      return {
        id: nanoid(),
        number: idx + 1,
        // Keep original line, including numbering and section markers.
        description: line.trim(),
      };
    })
    .filter((step) => step.description.length > 0);
}
