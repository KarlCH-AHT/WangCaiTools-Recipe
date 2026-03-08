import { Node, mergeAttributes } from "@tiptap/core";

export const RecipeSection = Node.create({
  name: "recipeSection",
  group: "block",
  content: "text*",
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-type="recipe-section"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "recipe-section",
        class: "font-semibold text-lg mt-6 mb-2",
      }),
      0,
    ];
  },
});
