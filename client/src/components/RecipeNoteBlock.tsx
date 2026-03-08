interface RecipeNoteBlockProps {
  text: string;
}

export function RecipeNoteBlock({ text }: RecipeNoteBlockProps) {
  return <p className="py-1 text-sm text-muted-foreground">{text}</p>;
}
