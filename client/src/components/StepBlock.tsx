import { GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface StepBlockProps {
  id: string;
  index: number;
  text: string;
  disabled?: boolean;
}

export function StepBlock({ id, index, text, disabled }: StepBlockProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group flex items-start gap-2 py-1.5 ${isDragging ? "opacity-60" : ""}`}
    >
      <button
        type="button"
        className="mt-0.5 hidden cursor-grab rounded p-1 text-muted-foreground hover:bg-zinc-100 md:inline-flex"
        aria-label="Drag step"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="mt-0.5 w-6 shrink-0 text-sm font-medium text-muted-foreground">{index}</span>
      <p className="min-w-0 flex-1 text-sm text-foreground">{text}</p>
    </div>
  );
}
