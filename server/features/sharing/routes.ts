import type { Express } from "express";
import { nanoid } from "nanoid";
import { authenticateRequest } from "../../auth";
import {
  createMenuShare,
  getDailyMenuByUserId,
  getMenuShareById,
  getRecipeById,
  getIngredientsByRecipeId,
  getStepsByRecipeId,
  getTagsByRecipeId,
  getImagesByRecipeId,
  updateMenuShareMetadata,
} from "../../db";

export function registerSharingRoutes(app: Express) {
  app.post("/api/share-menu", async (req: any, res: any) => {
    try {
      const user = await authenticateRequest(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      const items = await getDailyMenuByUserId(user.id);
      if (!items || items.length === 0) {
        return res.status(400).json({ error: "Menu is empty" });
      }

      const shareId = nanoid();
      const title = typeof req.body?.title === "string" ? req.body.title : undefined;
      await createMenuShare(user.id, {
        id: shareId,
        title,
        itemsJson: JSON.stringify(items.map((i) => ({ recipeId: i.recipeId, servings: i.servings }))),
        metadataJson: JSON.stringify({}),
      });

      return res.json({ id: shareId });
    } catch (err) {
      console.error("[Share Menu] Error:", err);
      return res.status(500).json({ error: "Share failed" });
    }
  });

  app.get("/api/share-menu/:id", async (req: any, res: any) => {
    try {
      const shareId = req.params.id;
      const share = await getMenuShareById(shareId);
      if (!share) return res.status(404).json({ error: "Share not found" });

      const items = JSON.parse(share.itemsJson || "[]") as { recipeId: string; servings: number }[];
      const itemResults = await Promise.all(
        items.map(async (item) => {
          const recipe = await getRecipeById(item.recipeId, 0);
          if (!recipe) return null;
          const [ingredients, steps, tags, images] = await Promise.all([
            getIngredientsByRecipeId(item.recipeId),
            getStepsByRecipeId(item.recipeId),
            getTagsByRecipeId(item.recipeId),
            getImagesByRecipeId(item.recipeId),
          ]);

          return {
            recipe: {
              ...recipe,
              ingredients,
              steps,
              tags,
              images: images.map((img) => img.url),
            },
            servings: item.servings,
          };
        }),
      );

      return res.json({
        share: {
          id: share.id,
          title: share.title,
          createdAt: share.createdAt,
          metadata: share.metadataJson ? JSON.parse(share.metadataJson) : {},
        },
        items: itemResults.filter(Boolean),
      });
    } catch (err) {
      console.error("[Share Menu] Fetch error:", err);
      return res.status(500).json({ error: "Failed to load share" });
    }
  });

  app.put("/api/share-menu/:id/collaboration", async (req: any, res: any) => {
    try {
      const shareId = req.params.id;
      const share = await getMenuShareById(shareId);
      if (!share) return res.status(404).json({ error: "Share not found" });

      await updateMenuShareMetadata(shareId, JSON.stringify(req.body ?? {}));
      return res.json({ success: true });
    } catch (err) {
      console.error("[Share Menu] Collaboration update error:", err);
      return res.status(500).json({ error: "Failed to save collaboration state" });
    }
  });
}
