import { Node, mergeAttributes } from "@tiptap/core";

export const RecipeStep = Node.create({
  name: "recipeStep",
  group: "block",
  content: "text*",

  parseHTML() {
    return [{ tag: 'div[data-type="recipe-step"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "recipe-step",
        class: "py-2",
      }),
      0,
    ];
  },
});
