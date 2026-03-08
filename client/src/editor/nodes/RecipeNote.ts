import { Node, mergeAttributes } from "@tiptap/core";

export const RecipeNote = Node.create({
  name: "recipeNote",
  group: "block",
  content: "text*",

  parseHTML() {
    return [{ tag: 'div[data-type="recipe-note"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "recipe-note",
        class: "text-sm text-muted-foreground py-1",
      }),
      0,
    ];
  },
});
