import type { RecipeIngredientParsed } from "@/types/recipe";

const UNITS = [
  "kg",
  "g",
  "ml",
  "l",
  "勺",
  "茶匙",
  "汤匙",
  "个",
  "根",
  "盒",
  "瓣",
  "片",
  "小把",
  "少许",
  "适量",
  "只",
] as const;

const UNIT_PATTERN = UNITS.slice().sort((a, b) => b.length - a.length).join("|");

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function parseIngredientLine(text: string): RecipeIngredientParsed | null {
  const input = text
    .replace(/\u3000/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!input) return null;

  const specialUnits = ["少许", "适量"] as const;
  const specialNoSpaceMatch = input.match(new RegExp(`^(.+?)(${specialUnits.map(escapeRegExp).join("|")})(?:\\s+(.+))?$`));
  if (specialNoSpaceMatch) {
    const [, name, unit, note] = specialNoSpaceMatch;
    return {
      name: name.trim(),
      amount: null,
      unit,
      note: note?.trim() || undefined,
    };
  }

  const specialMatch = input.match(new RegExp(`^(.+?)\\s+(${specialUnits.map(escapeRegExp).join("|")})(?:\\s+(.+))?$`));
  if (specialMatch) {
    const [, name, unit, note] = specialMatch;
    return {
      name: name.trim(),
      amount: null,
      unit,
      note: note?.trim() || undefined,
    };
  }

  // e.g. 牛肉 300g / 鸡蛋 2个 / 蒜 2瓣 切末
  const regex = new RegExp(`^(.+?)\\s+(\\d+(?:\\.\\d+)?)\\s*(${UNIT_PATTERN})?(?:\\s+(.+))?$`);
  const match = input.match(regex);
  if (match) {
    const [, name, amountRaw, unit, note] = match;
    const amount = Number(amountRaw);
    if (Number.isNaN(amount)) return null;
    return {
      name: name.trim(),
      amount,
      unit: unit || null,
      note: note?.trim() || undefined,
    };
  }

  // e.g. 牛肉300g / 鸡蛋2个 / 生抽1勺 / 2勺 生抽
  const compactTailMatch = input.match(new RegExp(`^(.+?)(\\d+(?:\\.\\d+)?)\\s*(${UNIT_PATTERN})(?:\\s+(.+))?$`));
  if (compactTailMatch) {
    const [, name, amountRaw, unit, note] = compactTailMatch;
    return {
      name: name.trim(),
      amount: Number(amountRaw),
      unit,
      note: note?.trim() || undefined,
    };
  }

  const prefixMatch = input.match(new RegExp(`^(\\d+(?:\\.\\d+)?)\\s*(${UNIT_PATTERN})\\s+(.+?)(?:\\s+(.+))?$`));
  if (prefixMatch) {
    const [, amountRaw, unit, name, note] = prefixMatch;
    return {
      name: name.trim(),
      amount: Number(amountRaw),
      unit,
      note: note?.trim() || undefined,
    };
  }

  // e.g. 5根葱 / 5根 葱
  const prefixNoSpaceMatch = input.match(new RegExp(`^(\\d+(?:\\.\\d+)?)\\s*(${UNIT_PATTERN})(.+)$`));
  if (prefixNoSpaceMatch) {
    const [, amountRaw, unit, name] = prefixNoSpaceMatch;
    return {
      name: name.trim(),
      amount: Number(amountRaw),
      unit,
    };
  }

  return null;
}

export const ingredientUnits = [...UNITS];
