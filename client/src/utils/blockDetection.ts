import { parseIngredientLine } from "@/utils/ingredientParser";

export function isSectionLine(text: string): boolean {
  return /[:：]\s*$/.test(text.trim());
}

export function isStepLine(text: string): boolean {
  return /^\d+\s*[.、\)）]\s*/.test(text.trim());
}

export function isIngredientLine(text: string): boolean {
  return parseIngredientLine(text) !== null;
}

export function detectBlockType(text: string): "section" | "ingredient" | "step" | "note" {
  if (isSectionLine(text)) return "section";
  if (isStepLine(text)) return "step";
  if (isIngredientLine(text)) return "ingredient";
  return "note";
}
