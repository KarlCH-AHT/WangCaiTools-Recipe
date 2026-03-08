import { Node, mergeAttributes } from "@tiptap/core";

export const RecipeIngredient = Node.create({
  name: "recipeIngredient",
  group: "block",
  content: "text*",

  parseHTML() {
    return [{ tag: 'div[data-type="recipe-ingredient"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "recipe-ingredient",
        class: "py-1",
      }),
      0,
    ];
  },
});
