import { useEffect, useMemo, useRef, useState } from "react";
import { useRecipeEditorStore } from "@/store/recipeStore";
import type { EditorBlock } from "@/types/recipe";
import { parseIngredientLine } from "@/utils/ingredientParser";
import { parseEditorDocToRecipeJSON } from "@/utils/recipeSerializer";
import { toRawText } from "@/utils/aiSmartCleanup";

interface RecipeEditorProps {
  initialTitle?: string;
  initialServings?: number;
  initialBlocks?: EditorBlock[];
  onSaveRecipe?: (payload: {
    title: string;
    servings: number;
    blocks: EditorBlock[];
    serialized: ReturnType<typeof parseEditorDocToRecipeJSON>;
  }) => void;
  onChangeRecipe?: (payload: {
    title: string;
    servings: number;
    blocks: EditorBlock[];
    serialized: ReturnType<typeof parseEditorDocToRecipeJSON>;
  }) => void;
}

type RenderGroup = {
  id: string;
  title: string | null;
  lines: string[];
};

const normalizeLine = (line: string) =>
  line
    .replace(/\uFF1A/g, ":")
    .replace(/\u3000/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const isSectionLine = (line: string) => /:\s*$/.test(normalizeLine(line));
const sectionTitle = (line: string) => normalizeLine(line).replace(/:\s*$/, "");

function buildBlocksFromText(text: string): EditorBlock[] {
  const lines = text.split("\n");
  const blocks: EditorBlock[] = [];
  let stepIndex = 1;
  let mode: "ingredient" | "step" = "step";

  lines.forEach((line) => {
    const raw = normalizeLine(line);
    if (!raw) return;

    if (isSectionLine(raw)) {
      blocks.push({ id: crypto.randomUUID(), type: "section", text: `${sectionTitle(raw)}:` });
      mode = /(料|食材|配料|ingredients|zutaten|酱|sauce)/i.test(raw) ? "ingredient" : "step";
      return;
    }

    const stepMatch = raw.match(/^(\d+)\s*[.、\)）]\s*(.*)$/);
    if (stepMatch) {
      const textOnly = (stepMatch[2] || "").trim();
      blocks.push({
        id: crypto.randomUUID(),
        type: "step",
        raw,
        index: Number(stepMatch[1]),
        text: textOnly,
      });
      mode = "step";
      return;
    }

    if (mode === "ingredient") {
      const parsed = parseIngredientLine(raw);
      if (parsed) {
        blocks.push({
          id: crypto.randomUUID(),
          type: "ingredient",
          raw,
          name: parsed.name,
          amount: parsed.amount,
          unit: parsed.unit,
          note: parsed.note,
        });
      } else {
        blocks.push({
          id: crypto.randomUUID(),
          type: "ingredient",
          raw,
          name: raw,
          amount: null,
          unit: null,
        });
      }
      return;
    }

    blocks.push({
      id: crypto.randomUUID(),
      type: "step",
      raw,
      index: stepIndex++,
      text: raw,
    });
  });

  return blocks.length > 0 ? blocks : [{ id: crypto.randomUUID(), type: "paragraph", text: "" }];
}

function groupLines(rawText: string): RenderGroup[] {
  const lines = rawText.split("\n");
  const groups: RenderGroup[] = [];
  let current: RenderGroup = { id: crypto.randomUUID(), title: null, lines: [] };

  lines.forEach((line) => {
    const raw = normalizeLine(line);
    if (!raw) return;

    if (isSectionLine(raw)) {
      if (current.lines.length > 0 || current.title) groups.push(current);
      current = { id: crypto.randomUUID(), title: sectionTitle(raw), lines: [] };
      return;
    }

    current.lines.push(raw);
  });

  if (current.lines.length > 0 || current.title) groups.push(current);
  return groups;
}

function highlightTokens(text: string) {
  const tokenRegex = /(\b\d+(?:[.,]\d+)?\s*(?:kg|g|mg|ml|l|EL|TL|个|只|勺|茶匙|汤匙|分钟|Min|mins?|Grad|°C|℃)\b|\b(?:ca\.?\s*)?\d+(?:[.,]\d+)?\s*(?:Min|分钟)\b)/gi;
  const parts = text.split(tokenRegex);
  return parts.map((part, idx) => {
    if (!part) return null;
    const isToken = tokenRegex.test(part);
    tokenRegex.lastIndex = 0;
    return isToken ? (
      <span key={`${part}-${idx}`} className="font-semibold text-orange-500">
        {part}
      </span>
    ) : (
      <span key={`${part}-${idx}`}>{part}</span>
    );
  });
}

export function RecipeEditor({
  initialTitle = "",
  initialServings = 2,
  initialBlocks,
  onSaveRecipe,
  onChangeRecipe,
}: RecipeEditorProps) {
  const { title, servings, rawDoc, setTitle, setServings, setBlocks } = useRecipeEditorStore();
  const initializedRef = useRef(false);
  const [rawText, setRawText] = useState("");

  useEffect(() => {
    if (initializedRef.current) return;
    setTitle(initialTitle);
    setServings(initialServings);
    const initial = initialBlocks?.length ? toRawText(initialBlocks) : "";
    setRawText(initial);
    setBlocks(buildBlocksFromText(initial));
    initializedRef.current = true;
  }, [initialBlocks, initialServings, initialTitle, setBlocks, setServings, setTitle]);

  useEffect(() => {
    const blocks = buildBlocksFromText(rawText);
    setBlocks(blocks);
    const payload = {
      title,
      servings,
      blocks,
      serialized: parseEditorDocToRecipeJSON(blocks),
    };
    onChangeRecipe?.(payload);
  }, [onChangeRecipe, rawText, servings, setBlocks, title]);

  const grouped = useMemo(() => groupLines(rawText), [rawText]);

  return (
    <div className="rounded-2xl border bg-white p-4 dark:bg-zinc-950">
      <div className="space-y-3">
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="像写正文一样输入。换行会在开始烹饪时作为新步骤；以冒号结尾会作为半成品分组标题。"
          className="min-h-[220px] w-full resize-y rounded-xl border bg-zinc-50 px-3 py-2 text-sm leading-7 outline-none focus:ring-2 focus:ring-zinc-300 dark:bg-zinc-900"
        />

        <div className="rounded-xl border bg-zinc-50 p-3 dark:bg-zinc-900/40">
          {grouped.length === 0 ? <p className="text-sm text-muted-foreground">输入后会在这里实时渲染。</p> : null}
          {grouped.map((group) => (
            <div key={group.id} className="mb-3 last:mb-0">
              {group.title ? <h4 className="mb-1 text-sm font-semibold">{group.title}</h4> : null}
              <div className="space-y-1">
                {group.lines.map((line, idx) => (
                  <p key={`${group.id}-${idx}`} className="text-sm leading-7">
                    {highlightTokens(line)}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="hidden">
          <button
            type="button"
            onClick={() => {
              const blocks = buildBlocksFromText(rawText);
              onSaveRecipe?.({
                title,
                servings,
                blocks,
                serialized: parseEditorDocToRecipeJSON(blocks),
              });
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
