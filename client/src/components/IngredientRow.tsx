interface IngredientRowProps {
  name: string;
  amount: number | null;
  unit: string | null;
  note?: string;
}

export function IngredientRow({ name, amount, unit, note }: IngredientRowProps) {
  return (
    <div className="py-1.5">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 text-sm text-foreground">{name}</span>
        {amount !== null && (
          <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
            {amount}
          </span>
        )}
        {unit && (
          <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
            {unit}
          </span>
        )}
      </div>
      {note ? <div className="mt-1 text-xs text-muted-foreground">{note}</div> : null}
    </div>
  );
}
