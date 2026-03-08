import { useEffect, useMemo, useState } from "react";
import { Check, ListChecks, ScrollText } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";
import { useRecipes } from "@/contexts/RecipeContext";

type ParsedIngredient = {
  id: string;
  raw: string;
  name: string;
  amount: string | null;
  unit: string | null;
  isSection?: boolean;
};

type StepEntity = {
  type: "time" | "temperature";
  value: string;
};

type ParsedStep = {
  id: string;
  index: number;
  text: string;
  entities: StepEntity[];
  isSection?: boolean;
};

type ParsedRecipe = {
  ingredients: ParsedIngredient[];
  steps: ParsedStep[];
};

type ViewMode = "overview" | "ingredients" | "instructions";

const ingredientUnits = [
  "kg",
  "g",
  "mg",
  "l",
  "ml",
  "EL",
  "TL",
  "x",
  "个",
  "只",
  "勺",
  "茶匙",
  "汤匙",
  "少许",
  "适量",
  "克",
];

const normalizeLine = (line: string) =>
  line
    .replace(/\uFF1A/g, ":")
    .replace(/\u3000/g, " ")
    .trim();

function parseIngredient(line: string): ParsedIngredient | null {
  const unitPattern = ingredientUnits.join("|");

  const complex = line.match(new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s*(x|EL|TL)\\s+(.+?)\\s*\\+\\s*(\\d+(?:[.,]\\d+)?)\\s*(EL|TL|ml|g)\\s+(.+)$`, "i"));
  if (complex) {
    const [, a1, u1, n1, a2, u2, n2] = complex;
    return {
      id: crypto.randomUUID(),
      raw: line,
      name: `${n1} + ${n2}`,
      amount: `${a1} + ${a2}`,
      unit: `${u1} + ${u2}`,
    };
  }

  const std = line.match(new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s*(${unitPattern})\\s*(.+)$`, "i"));
  if (std) {
    const [, amount, unit, name] = std;
    return { id: crypto.randomUUID(), raw: line, name: name.trim(), amount, unit };
  }

  const tail = line.match(new RegExp(`^(.+?)\\s+(\\d+(?:[.,]\\d+)?)\\s*(${unitPattern})$`, "i"));
  if (tail) {
    const [, name, amount, unit] = tail;
    return { id: crypto.randomUUID(), raw: line, name: name.trim(), amount, unit };
  }

  // name + unit + amount, e.g. 牛肉 克 500 / 牛肉 g 200
  const unitBeforeAmount = line.match(new RegExp(`^(.+?)\\s*(${unitPattern})\\s*(\\d+(?:[.,]\\d+)?)$`, "i"));
  if (unitBeforeAmount) {
    const [, name, unit, amount] = unitBeforeAmount;
    return { id: crypto.randomUUID(), raw: line, name: name.trim(), amount, unit };
  }

  // amount + unit + name without spaces, e.g. 500g牛肉
  const compactStart = line.match(new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s*(${unitPattern})(.+)$`, "i"));
  if (compactStart) {
    const [, amount, unit, name] = compactStart;
    return { id: crypto.randomUUID(), raw: line, name: name.trim(), amount, unit };
  }

  // loose: amount + name (without explicit unit)
  const amountName = line.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/);
  if (amountName) {
    const [, amount, name] = amountName;
    return { id: crypto.randomUUID(), raw: line, name: name.trim(), amount, unit: null };
  }

  const loose = line.match(/(.+?)(少许|适量)$/);
  if (loose) {
    const [, name, unit] = loose;
    return { id: crypto.randomUUID(), raw: line, name: name.trim(), amount: null, unit };
  }

  return null;
}

function extractEntities(stepText: string): StepEntity[] {
  const entities: StepEntity[] = [];

  const timeMatches = stepText.match(/\b(?:ca\.?\s*)?\d+(?:[.,]\d+)?\s*(?:Min|分钟|mins?)\b/gi) ?? [];
  timeMatches.forEach((m) => entities.push({ type: "time", value: m }));

  const tempMatches = stepText.match(/\b\d+(?:[.,]\d+)?\s*(?:Grad|°C|℃)\b/gi) ?? [];
  tempMatches.forEach((m) => entities.push({ type: "temperature", value: m }));

  return entities;
}

function parseRecipeText(input: string): ParsedRecipe {
  const lines = input.split("\n").map(normalizeLine).filter(Boolean);
  const ingredients: ParsedIngredient[] = [];
  const steps: ParsedStep[] = [];

  let inIngredientSection = false;
  let inInstructionSection = false;
  let stepIndex = 1;

  for (const line of lines) {
    if (/:$/.test(line)) {
      const ingredientHeader = /(料|食材|配料|zutaten|sauce|酱)/i.test(line);
      const instructionHeader = /(步骤|说明|instructions|schritte|step)/i.test(line);

      if (ingredientHeader) {
        inIngredientSection = true;
        inInstructionSection = false;
        ingredients.push({
          id: crypto.randomUUID(),
          raw: line,
          name: line.replace(/:\s*$/, ""),
          amount: null,
          unit: null,
          isSection: true,
        });
      } else if (instructionHeader) {
        inIngredientSection = false;
        inInstructionSection = true;
        steps.push({
          id: crypto.randomUUID(),
          index: stepIndex++,
          text: line.replace(/:\s*$/, ""),
          entities: [],
          isSection: true,
        });
      } else {
        // Unknown section title: keep it under current active stream.
        if (inIngredientSection || (!inIngredientSection && !inInstructionSection)) {
          inIngredientSection = true;
          ingredients.push({
            id: crypto.randomUUID(),
            raw: line,
            name: line.replace(/:\s*$/, ""),
            amount: null,
            unit: null,
            isSection: true,
          });
        } else {
          inInstructionSection = true;
          steps.push({
            id: crypto.randomUUID(),
            index: stepIndex++,
            text: line.replace(/:\s*$/, ""),
            entities: [],
            isSection: true,
          });
        }
      }
      continue;
    }

    const numbered = line.match(/^(\d+)\s*[.)、]\s*(.*)$/);
    if (numbered) {
      const text = numbered[2].trim();
      steps.push({
        id: crypto.randomUUID(),
        index: Number(numbered[1]),
        text,
        entities: extractEntities(text),
      });
      inIngredientSection = false;
      inInstructionSection = true;
      continue;
    }

    const parsedIngredient = parseIngredient(line);
    if (parsedIngredient || inIngredientSection) {
      ingredients.push(
        parsedIngredient ?? {
          id: crypto.randomUUID(),
          raw: line,
          name: line,
          amount: null,
          unit: null,
        },
      );
      continue;
    }

    steps.push({
      id: crypto.randomUUID(),
      index: stepIndex++,
      text: line,
      entities: extractEntities(line),
    });
    inInstructionSection = true;
  }

  if (steps.some((s) => s.index !== steps[0]?.index + (steps.indexOf(s) || 0))) {
    steps.forEach((s, i) => {
      s.index = i + 1;
    });
  }

  return { ingredients, steps };
}

function highlightEntities(text: string, entities: StepEntity[]) {
  if (entities.length === 0) return text;
  const tokens = entities.map((e) => e.value).filter(Boolean);
  const escaped = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (escaped.length === 0) return text;

  const regex = new RegExp(`(${escaped.join("|")})`, "gi");
  return text.split(regex).map((part, idx) => {
    const isEntity = tokens.some((t) => t.toLowerCase() === part.toLowerCase());
    return isEntity ? (
      <span key={`${part}-${idx}`} className="font-semibold text-orange-500">
        {part}
      </span>
    ) : (
      <span key={`${part}-${idx}`}>{part}</span>
    );
  });
}

export default function ImmersiveCookingAssistant() {
  const { recipes, updateRecipe } = useRecipes();
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/immersive-cooking/:id");
  const recipeId = match ? params.id : null;

  const [mode, setMode] = useState<ViewMode>("overview");
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});
  const [input, setInput] = useState(`食材:\n200 g Mehl\n3 g Backpulver\n1x Eigelb + 1 EL Wasser\n110 g Zucker\n120 g Kokosöl\n\n说明:\nKokosöl mit Zucker vermischen\nBackpulver unterrühren\nNach und nach Eigelbwasser unterrühren\nMehl dazugeben\n搅衣服, ca. 3 Min\n210 Grad vorheizen\nKekse mit Sesam bestreuen\n12 Min backen`);
  const [currentRecipeId, setCurrentRecipeId] = useState<string | null>(recipeId);

  const parsed = useMemo(() => parseRecipeText(input), [input]);
  const currentRecipe = useMemo(
    () => recipes.find((r) => r.id === currentRecipeId) ?? null,
    [recipes, currentRecipeId],
  );

  useEffect(() => {
    if (!recipes.length) return;
    const target = recipeId ? recipes.find((r) => r.id === recipeId) : recipes[0];
    if (!target) return;
    setCurrentRecipeId(target.id);

    const ingredientLines = (target.ingredients ?? []).map((ing) => `${ing.amount} ${ing.unit} ${ing.name}`.trim());
    const stepLines = (target.steps ?? [])
      .slice()
      .sort((a, b) => a.number - b.number)
      .map((s) => `${s.number}. ${s.description}`);
    const noteLines = target.notes ? target.notes.split("\n").filter(Boolean) : [];
    const seed = [
      "食材:",
      ...ingredientLines,
      "",
      "说明:",
      ...stepLines,
      ...noteLines,
    ].join("\n");
    setInput(seed);
  }, [recipes, recipeId]);

  const toggleIngredient = (id: string) => {
    setCheckedIngredients((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSaveToRecipe = async () => {
    if (!currentRecipe) return;
    try {
      await updateRecipe(currentRecipe.id, {
        title: currentRecipe.title,
        servings: currentRecipe.servings,
        ingredients: parsed.ingredients
          .filter((ing) => !ing.isSection)
          .map((ing) => ({
          id: crypto.randomUUID(),
          name: ing.name,
          amount: Number(ing.amount?.replace(",", ".")) || 0,
          unit: ing.unit || "适量",
        })),
        steps: parsed.steps
          .filter((step) => !step.isSection)
          .map((step) => ({
          id: crypto.randomUUID(),
          number: step.index,
          description: step.text,
        })),
        notes: input,
      });
      toast.success("已保存解析结果到当前菜谱");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <div className="mx-auto w-full max-w-md px-4 pb-8 pt-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold">Immersive Cooking UI</h1>
          <button
            onClick={() => navigate("/")}
            className="rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300"
          >
            返回
          </button>
        </div>

        <div className="mb-3 flex items-center gap-2">
          <select
            value={currentRecipeId ?? ""}
            onChange={(e) => setCurrentRecipeId(e.target.value || null)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm"
          >
            {recipes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
          <button
            onClick={handleSaveToRecipe}
            disabled={!currentRecipe}
            className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-black disabled:opacity-50"
          >
            保存
          </button>
        </div>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="mb-4 min-h-[160px] w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-orange-500"
        />

        {mode === "overview" && (
          <div className="space-y-4">
            <button className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-orange-500">开始烹饪 ▶</button>

            <section>
              <h2 className="mb-2 text-xl font-bold">食材</h2>
              <div className="space-y-2">
                {parsed.ingredients.map((ing) => (
                  <div key={ing.id} className="text-2xl leading-tight">
                    {ing.isSection ? (
                      <span className="text-xl font-bold">{ing.name}</span>
                    ) : (
                      <>
                        {ing.amount ? <span className="font-semibold text-orange-500">{ing.amount} </span> : null}
                        {ing.unit ? <span className="font-semibold text-orange-500">{ing.unit} </span> : null}
                        <span>{ing.name || ing.raw}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-bold">说明</h2>
              <div className="space-y-2 text-lg">
                {parsed.steps.map((step) => (
                  <div key={step.id} className={step.isSection ? "font-bold" : ""}>
                    {step.isSection ? step.text : highlightEntities(step.text, step.entities)}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {mode === "ingredients" && (
          <div className="space-y-3 pt-2">
            {parsed.ingredients.map((ing) => (
              <label key={ing.id} className="flex items-center gap-3 text-2xl">
                {!ing.isSection ? (
                  <button
                    type="button"
                    onClick={() => toggleIngredient(ing.id)}
                    className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                      checkedIngredients[ing.id] ? "border-orange-500 bg-orange-500" : "border-zinc-500"
                    }`}
                  >
                    {checkedIngredients[ing.id] ? <Check className="h-4 w-4 text-black" /> : null}
                  </button>
                ) : (
                  <span className="w-6" />
                )}
                <span>
                  {ing.isSection ? (
                    <span className="font-bold">{ing.name}</span>
                  ) : (
                    <>
                      {ing.amount ? <span className="font-semibold text-orange-500">{ing.amount} </span> : null}
                      {ing.unit ? <span className="font-semibold text-orange-500">{ing.unit} </span> : null}
                      {ing.name || ing.raw}
                    </>
                  )}
                </span>
              </label>
            ))}
          </div>
        )}

        {mode === "instructions" && (
          <div className="space-y-2 pt-2">
            {parsed.steps.map((step) => {
              const active = step.id === activeStepId;
              return (
                <button
                  key={step.id}
                  onClick={() => setActiveStepId(step.id)}
                  className={`flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left text-2xl ${
                    active ? "bg-zinc-800" : "bg-transparent"
                  }`}
                >
                  <span className="w-6 shrink-0 text-zinc-500">{step.isSection ? "" : step.index}</span>
                  <span className={step.isSection ? "font-bold" : ""}>
                    {step.isSection ? step.text : highlightEntities(step.text, step.entities)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="fixed bottom-6 left-1/2 flex -translate-x-1/2 gap-1 rounded-full border border-zinc-700 bg-zinc-900 p-1">
          <button
            onClick={() => setMode("ingredients")}
            className={`flex items-center gap-1 rounded-full px-4 py-2 text-sm ${mode === "ingredients" ? "bg-zinc-700 text-orange-400" : "text-zinc-300"}`}
          >
            <ListChecks className="h-4 w-4" /> 食材
          </button>
          <button
            onClick={() => setMode("instructions")}
            className={`flex items-center gap-1 rounded-full px-4 py-2 text-sm ${mode === "instructions" ? "bg-zinc-700 text-orange-400" : "text-zinc-300"}`}
          >
            <ScrollText className="h-4 w-4" /> 说明
          </button>
          <button
            onClick={() => setMode("overview")}
            className={`rounded-full px-4 py-2 text-sm ${mode === "overview" ? "bg-zinc-700 text-orange-400" : "text-zinc-300"}`}
          >
            总览
          </button>
        </div>
      </div>
    </div>
  );
}
