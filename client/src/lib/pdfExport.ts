import { Recipe } from "@/types/recipe";

/**
 * Export a recipe to PDF using the server-side endpoint.
 * The server uses PDFKit with NotoSansCJK font which supports Chinese, German, and English fonts.
 * Images are downloaded server-side and embedded in the PDF.
 */
export const exportRecipeToPDF = async (recipe: Recipe) => {
  const response = await fetch(`/api/export-pdf/${encodeURIComponent(recipe.id)}`);

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `PDF export failed: ${response.status}`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  // Trigger download
  const a = document.createElement("a");
  a.href = url;
  a.download = `${recipe.title || "recipe"}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
