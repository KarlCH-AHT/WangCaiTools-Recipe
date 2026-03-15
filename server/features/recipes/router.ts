import { z } from "zod";
import { invokeLLM } from "../../_core/llm";
// generateImage import removed - now using Unsplash web search instead
import { storagePut } from "../../storage";
import { protectedProcedure, router } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  createRecipe,
  getRecipesByUserId,
  getRecipeById,
  getRecipesByIds,
  updateRecipe,
  deleteRecipe,
  getIngredientsByRecipeId,
  getIngredientsByRecipeIds,
  getStepsByRecipeId,
  getStepsByRecipeIds,
  getTagsByRecipeId,
  getTagsByRecipeIds,
  getImagesByRecipeId,
  getImagesByRecipeIds,
  deleteIngredientsByRecipeId,
  deleteStepsByRecipeId,
  deleteTagsByRecipeId,
  deleteImagesByRecipeId,
  createIngredient,
  createStep,
  createTag,
  createRecipeImage,
  getDailyMenuByUserId,
  getDailyMenuItemByRecipeId,
  addToDailyMenu,
  removeFromDailyMenu,
  clearDailyMenu,
  updateDailyMenuItemServings,
  createWeeklyMenu,
  getWeeklyMenusByUserId,
  getWeeklyMenuById,
  updateWeeklyMenuById,
  deleteWeeklyMenuById,
} from "../../db";
import { nanoid } from "nanoid";

// Wikipedia image helpers
const WIKI_HEADERS = { 'User-Agent': 'FamilyRecipePlanner/1.0 (recipe app)' };

async function getWikiThumb(title: string): Promise<string | undefined> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&pithumbsize=800&redirects=1`;
  const resp = await fetch(url, { headers: WIKI_HEADERS, signal: AbortSignal.timeout(8000) });
  if (!resp.ok) return undefined;
  const data = await resp.json();
  const pages = data?.query?.pages;
  if (!pages) return undefined;
  const page = Object.values(pages)[0] as any;
  return page?.thumbnail?.source as string | undefined;
}

// Helper: upload a base64 data URL to S3 and return the CDN URL
async function uploadBase64Image(dataUrl: string, prefix = "recipe-images"): Promise<string> {
  // If it's already an http URL, return as-is
  if (dataUrl.startsWith("http")) return dataUrl;
  // Parse data URL: data:<mime>;base64,<data>
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return dataUrl; // not a data URL, return as-is
  const mimeType = match[1];
  const base64Data = match[2];
  const buffer = Buffer.from(base64Data, "base64");
  const ext = mimeType.split("/")[1] || "jpg";
  const key = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { url } = await storagePut(key, buffer, mimeType);
  // If storage backend is not configured, keep the original data URL to avoid silent image loss.
  if (!url) return dataUrl;
  return url;
}

const RecipeInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  servings: z.number().int().min(1).default(1),
  prepTime: z.number().int().optional(),
  cookTime: z.number().int().optional(),
  imageUrl: z.string().optional(),
  images: z.array(z.string()).optional(), // array of base64 or URLs
  isFavorite: z.number().int().optional(),
  rating: z.number().int().min(0).max(5).optional(),
  notes: z.string().optional(),
  sourceUrl: z.string().optional(),
});

const RecipeUpdateSchema = RecipeInputSchema.partial();

const IngredientInputSchema = z.object({
  name: z.string().min(1),
  amount: z.number().min(0),
  unit: z.string().min(1),
});

const StepInputSchema = z.object({
  number: z.number().int().min(1),
  description: z.string().min(1),
});

const TagInputSchema = z.object({
  tag: z.string().min(1),
});

const WeeklyMenuItemSchema = z.object({
  recipeId: z.string(),
  servings: z.number().min(0.5),
});

const WeeklyMenuItemsSchema = z.record(z.string(), z.array(WeeklyMenuItemSchema));

function attachRecipeRelations(recipes: any[], ingredients: any[], steps: any[], tags: any[], images: any[]) {
  const ingredientMap = new Map<string, any[]>();
  const stepMap = new Map<string, any[]>();
  const tagMap = new Map<string, any[]>();
  const imageMap = new Map<string, string[]>();

  ingredients.forEach((item) => {
    const bucket = ingredientMap.get(item.recipeId) ?? [];
    bucket.push(item);
    ingredientMap.set(item.recipeId, bucket);
  });
  steps.forEach((item) => {
    const bucket = stepMap.get(item.recipeId) ?? [];
    bucket.push(item);
    stepMap.set(item.recipeId, bucket);
  });
  tags.forEach((item) => {
    const bucket = tagMap.get(item.recipeId) ?? [];
    bucket.push(item);
    tagMap.set(item.recipeId, bucket);
  });
  images.forEach((item) => {
    const bucket = imageMap.get(item.recipeId) ?? [];
    bucket.push(item.url);
    imageMap.set(item.recipeId, bucket);
  });

  return recipes.map((recipe) => ({
    ...recipe,
    ingredients: ingredientMap.get(recipe.id) ?? [],
    steps: stepMap.get(recipe.id) ?? [],
    tags: tagMap.get(recipe.id) ?? [],
    images: imageMap.get(recipe.id) ?? [],
  }));
}

export const recipesRouter = router({
  // Get all recipes for current user
  list: protectedProcedure.query(async ({ ctx }) => {
    const recipes = await getRecipesByUserId(ctx.user.id);
    const recipeIds = recipes.map((recipe) => recipe.id);
    const [ingredients, steps, tags, images] = await Promise.all([
      getIngredientsByRecipeIds(recipeIds),
      getStepsByRecipeIds(recipeIds),
      getTagsByRecipeIds(recipeIds),
      getImagesByRecipeIds(recipeIds),
    ]);

    return attachRecipeRelations(recipes, ingredients, steps, tags, images);
  }),

  // Get single recipe with all related data
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const recipe = await getRecipeById(input.id, ctx.user.id);
      if (!recipe) return null;
      
      const ingredients = await getIngredientsByRecipeId(recipe.id);
      const steps = await getStepsByRecipeId(recipe.id);
      const tags = await getTagsByRecipeId(recipe.id);
      const images = await getImagesByRecipeId(recipe.id);
      
      return {
        ...recipe,
        ingredients,
        steps,
        tags,
        images: images.map(img => img.url),
      };
    }),

  // Create new recipe with ingredients and steps
  create: protectedProcedure
    .input(
      RecipeInputSchema.extend({
        ingredients: z.array(IngredientInputSchema),
        steps: z.array(StepInputSchema),
        tags: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const recipeId = nanoid();
      const { ingredients: ingredientInputs, steps: stepInputs, tags: tagInputs, images: imageInputs, ...recipeData } = input;
      
      // Upload base64 images to S3 first
      const uploadedImageUrls: string[] = [];
      if (imageInputs?.length) {
        for (const imgData of imageInputs) {
          try {
            const url = await uploadBase64Image(imgData);
            uploadedImageUrls.push(url);
          } catch (e) {
            console.error("[Image Upload] Failed to upload image:", e);
          }
        }
      }

      // Create recipe (store first image as imageUrl for backward compat)
      const recipe = await createRecipe(ctx.user.id, {
        id: recipeId,
        ...recipeData,
        imageUrl: uploadedImageUrls[0] || recipeData.imageUrl || null,
        isFavorite: 0,
      });
      
      // Create ingredients
      const ingredients = await Promise.all(
        ingredientInputs.map((ing) =>
          createIngredient({
            id: nanoid(),
            recipeId,
            ...ing,
          })
        )
      );
      
      // Create steps
      const steps = await Promise.all(
        stepInputs.map((step) =>
          createStep({
            id: nanoid(),
            recipeId,
            ...step,
          })
        )
      );
      
      // Create tags
      const tags = await Promise.all(
        tagInputs.map((tag) =>
          createTag({
            id: nanoid(),
            recipeId,
            tag,
          })
        )
      );
      
      // Create recipe images (already uploaded to S3)
      const images = uploadedImageUrls.length ? await Promise.all(
        uploadedImageUrls.map((url, idx) =>
          createRecipeImage({
            id: nanoid(),
            recipeId,
            url,
            sortOrder: idx,
          })
        )
      ) : [];
      
      return {
        ...recipe,
        ingredients,
        steps,
        tags,
        images: images.map(img => img.url),
      };
    }),

  // Update recipe
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: RecipeUpdateSchema.extend({
          ingredients: z.array(IngredientInputSchema).optional(),
          steps: z.array(StepInputSchema).optional(),
          tags: z.array(z.string()).optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, data } = input;
      const { ingredients: ingredientInputs, steps: stepInputs, tags: tagInputs, ...recipeData } = data;
      
      // Update recipe
      await updateRecipe(id, ctx.user.id, recipeData as any);
      
      // Update ingredients if provided
      if (ingredientInputs) {
        await deleteIngredientsByRecipeId(id);
        await Promise.all(
          ingredientInputs.map((ing) =>
            createIngredient({
              id: nanoid(),
              recipeId: id,
              ...ing,
            })
          )
        );
      }
      
      // Update steps if provided
      if (stepInputs) {
        await deleteStepsByRecipeId(id);
        await Promise.all(
          stepInputs.map((step) =>
            createStep({
              id: nanoid(),
              recipeId: id,
              ...step,
            })
          )
        );
      }
      
      // Update tags if provided
      if (tagInputs) {
        await deleteTagsByRecipeId(id);
        await Promise.all(
          tagInputs.map((tag) =>
            createTag({
              id: nanoid(),
              recipeId: id,
              tag,
            })
          )
        );
      }
      
      // Update images if provided - upload base64 to S3 first
      const imageInputs = data.images;
      if (imageInputs !== undefined) {
        await deleteImagesByRecipeId(id);
        if (imageInputs.length > 0) {
          const uploadedUrls: string[] = [];
          for (const imgData of imageInputs) {
            try {
              const url = await uploadBase64Image(imgData);
              uploadedUrls.push(url);
            } catch (e) {
              console.error("[Image Upload] Failed to upload image:", e);
            }
          }
          await Promise.all(
            uploadedUrls.map((url, idx) =>
              createRecipeImage({
                id: nanoid(),
                recipeId: id,
                url,
                sortOrder: idx,
              })
            )
          );
          // Also update imageUrl for backward compat
          if (uploadedUrls[0]) {
            await updateRecipe(id, ctx.user.id, { imageUrl: uploadedUrls[0] });
          }
        }
      }
      
      // Return updated recipe
      const recipe = await getRecipeById(id, ctx.user.id);
      if (!recipe) throw new Error("Recipe not found");
      
      const ingredients = await getIngredientsByRecipeId(id);
      const steps = await getStepsByRecipeId(id);
      const tags = await getTagsByRecipeId(id);
      const images = await getImagesByRecipeId(id);
      
      return {
        ...recipe,
        ingredients,
        steps,
        tags,
        images: images.map(img => img.url),
      };
    }),

  // Delete recipe
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await deleteImagesByRecipeId(input.id);
      await deleteRecipe(input.id, ctx.user.id);
      return { success: true };
    }),

  // Toggle favorite
  toggleFavorite: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const recipe = await getRecipeById(input.id, ctx.user.id);
      if (!recipe) throw new Error("Recipe not found");
      
      await updateRecipe(input.id, ctx.user.id, {
        isFavorite: recipe.isFavorite ? 0 : 1,
      });
      
      return { success: true };
    }),

  // Daily Menu operations
  getDailyMenu: protectedProcedure.query(async ({ ctx }) => {
    const items = await getDailyMenuByUserId(ctx.user.id);
    
    // Fetch recipe data for each item
    const itemsWithRecipes = await Promise.all(
      items.map(async (item) => {
        const recipe = await getRecipeById(item.recipeId, ctx.user.id);
        return {
          ...item,
          recipe,
        };
      })
    );
    
    return itemsWithRecipes;
  }),

  addToDailyMenu: protectedProcedure
    .input(z.object({ recipeId: z.string(), servings: z.number().int().min(1).default(1) }))
    .mutation(async ({ ctx, input }) => {
      const recipe = await getRecipeById(input.recipeId, ctx.user.id);
      if (!recipe) throw new Error("Recipe not found");

      const existingItem = await getDailyMenuItemByRecipeId(ctx.user.id, input.recipeId);
      if (existingItem) {
        await updateDailyMenuItemServings(existingItem.id, ctx.user.id, input.servings);
        return { ...existingItem, servings: input.servings };
      }

      return addToDailyMenu(ctx.user.id, {
        id: nanoid(),
        recipeId: input.recipeId,
        servings: input.servings,
      });
    }),

  updateDailyMenuItem: protectedProcedure
    .input(z.object({ recipeId: z.string(), servings: z.number().min(0.5) }))
    .mutation(async ({ ctx, input }) => {
      const existingItem = await getDailyMenuItemByRecipeId(ctx.user.id, input.recipeId);
      if (!existingItem) throw new TRPCError({ code: "NOT_FOUND", message: "Menu item not found" });

      await updateDailyMenuItemServings(existingItem.id, ctx.user.id, input.servings);
      return { success: true };
    }),

  removeFromDailyMenuByRecipe: protectedProcedure
    .input(z.object({ recipeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existingItem = await getDailyMenuItemByRecipeId(ctx.user.id, input.recipeId);
      if (!existingItem) return { success: true };
      await removeFromDailyMenu(existingItem.id, ctx.user.id);
      return { success: true };
    }),

  removeFromDailyMenu: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await removeFromDailyMenu(input.id, ctx.user.id);
      return { success: true };
    }),

  clearDailyMenu: protectedProcedure.mutation(async ({ ctx }) => {
    await clearDailyMenu(ctx.user.id);
    return { success: true };
  }),

  listWeeklyMenus: protectedProcedure.query(async ({ ctx }) => {
    const rows = await getWeeklyMenusByUserId(ctx.user.id);
    return rows.map((row) => ({
      ...row,
      items: JSON.parse(row.itemsJson || "{}") as Record<string, Array<{ recipeId: string; servings: number }>>,
    }));
  }),

  createWeeklyMenu: protectedProcedure
    .input(z.object({
      title: z.string().optional(),
      startDate: z.string(),
      items: WeeklyMenuItemsSchema.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const created = await createWeeklyMenu(ctx.user.id, {
        id: nanoid(),
        title: input.title,
        startDate: input.startDate,
        itemsJson: JSON.stringify(input.items ?? {}),
      });

      return {
        ...created,
        items: JSON.parse(created.itemsJson || "{}"),
      };
    }),

  updateWeeklyMenu: protectedProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().optional(),
      startDate: z.string().optional(),
      items: WeeklyMenuItemsSchema.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await updateWeeklyMenuById(input.id, ctx.user.id, {
        title: input.title,
        startDate: input.startDate,
        itemsJson: input.items ? JSON.stringify(input.items) : undefined,
      });
      return { success: true };
    }),

  addWeeklyMenuItem: protectedProcedure
    .input(z.object({
      menuId: z.string(),
      day: z.string(),
      item: WeeklyMenuItemSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const menu = await getWeeklyMenuById(input.menuId, ctx.user.id);
      if (!menu) throw new TRPCError({ code: "NOT_FOUND", message: "Weekly menu not found" });

      const items = JSON.parse(menu.itemsJson || "{}") as Record<string, Array<{ recipeId: string; servings: number }>>;
      const dayItems = items[input.day] || [];
      const nextItems = {
        ...items,
        [input.day]: [...dayItems.filter((entry) => entry.recipeId !== input.item.recipeId), input.item],
      };

      await updateWeeklyMenuById(input.menuId, ctx.user.id, {
        itemsJson: JSON.stringify(nextItems),
      });

      return { success: true };
    }),

  removeWeeklyMenuItem: protectedProcedure
    .input(z.object({
      menuId: z.string(),
      day: z.string(),
      recipeId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const menu = await getWeeklyMenuById(input.menuId, ctx.user.id);
      if (!menu) return { success: true };

      const items = JSON.parse(menu.itemsJson || "{}") as Record<string, Array<{ recipeId: string; servings: number }>>;
      const nextItems = {
        ...items,
        [input.day]: (items[input.day] || []).filter((entry) => entry.recipeId !== input.recipeId),
      };

      await updateWeeklyMenuById(input.menuId, ctx.user.id, {
        itemsJson: JSON.stringify(nextItems),
      });

      return { success: true };
    }),

  deleteWeeklyMenu: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await deleteWeeklyMenuById(input.id, ctx.user.id);
      return { success: true };
    }),

  initializeSampleRecipes: protectedProcedure.mutation(async ({ ctx }) => {
    const { sampleRecipes } = await import("../../sampleRecipes");
    const createdRecipes = [];
    
    for (const sample of sampleRecipes) {
      const recipeId = nanoid();
      await createRecipe(ctx.user.id, {
        id: recipeId,
        title: sample.title,
        description: sample.description,
        category: sample.category,
        servings: sample.servings,
        prepTime: sample.prepTime,
        cookTime: sample.cookTime,
        isFavorite: 0,
      });
      
      await Promise.all(
        sample.ingredients.map((ing) =>
          createIngredient({
            id: nanoid(),
            recipeId,
            name: ing.name,
            amount: ing.amount,
            unit: ing.unit,
          })
        )
      );
      
      await Promise.all(
        sample.steps.map((step) =>
          createStep({
            id: nanoid(),
            recipeId,
            number: step.number,
            description: step.description,
          })
        )
      );
      
      await Promise.all(
        sample.tags.map((tag) =>
          createTag({
            id: nanoid(),
            recipeId,
            tag,
          })
        )
      );
      
      createdRecipes.push(recipeId);
    }
    
    return { success: true, count: createdRecipes.length };
  }),

  // Import recipe from URL using AI
  importFromUrl: protectedProcedure
    .input(z.object({
      url: z.string().url(),
    }))
    .mutation(async ({ input }) => {
      // Fetch the web page content
      let pageContent = "";
      let scrapedImageUrl: string | undefined;
      try {
        const response = await fetch(input.url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; RecipeBot/1.0)",
            "Accept": "text/html,application/xhtml+xml",
          },
          signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const html = await response.text();

        // Try to extract the first large image from the page
        // Prefer og:image meta tag
        const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
          || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
        if (ogImageMatch) {
          scrapedImageUrl = ogImageMatch[1];
        } else {
          // Fallback: find first <img> with src that looks like a food photo (not icon/logo)
          const imgMatches = Array.from(html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi));
          for (const m of imgMatches) {
            const src = m[1];
            if (src && !src.includes("logo") && !src.includes("icon") && !src.includes("avatar") && src.match(/\.(jpg|jpeg|png|webp)/i)) {
              // Make absolute URL if relative
              try {
                scrapedImageUrl = new URL(src, input.url).href;
              } catch { scrapedImageUrl = src; }
              break;
            }
          }
        }

        // Strip HTML tags and extract text content (basic approach)
        pageContent = html
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/\s{2,}/g, " ")
          .trim()
          .slice(0, 8000); // Limit to 8000 chars to stay within LLM context
      } catch (err) {
        throw new Error(`Failed to fetch URL: ${(err as Error).message}`);
      }

      const prompt = `Extract the recipe from the following web page content and return it as JSON.

IMPORTANT:
- Detect the language used in the recipe content and write ALL text fields in that SAME language.
- If the detected language is Chinese, you MUST output Simplified Chinese (简体中文, zh-Hans) only. Do NOT use Traditional Chinese.

Source URL: ${input.url}
Page content:
${pageContent}

Return ONLY valid JSON with this exact structure:
{
  "title": "recipe title",
  "description": "brief description",
  "category": "breakfast|lunch|dinner|dessert|snack",
  "servings": number,
  "prepTime": number (in minutes),
  "cookTime": number (in minutes),
  "ingredients": [{"name": "ingredient", "amount": number, "unit": "g|ml|tbsp|tsp|piece|cup"}],
  "steps": [{"number": 1, "description": "step description"}]
}`;

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "You are a recipe extraction expert. Extract recipe data from web page content and return valid JSON only. If no recipe is found, return an error field in the JSON. When output language is Chinese, always use Simplified Chinese (zh-Hans), never Traditional Chinese.",
          },
          { role: "user", content: prompt },
        ],
      });

      const responseContent = response.choices[0]?.message.content;
      const responseText = typeof responseContent === "string" ? responseContent : "";
      let recipeData: any;
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found");
        recipeData = JSON.parse(jsonMatch[0]);
      } catch (error) {
        throw new Error("Failed to parse recipe data from AI");
      }

      if (recipeData.error) {
        throw new Error(recipeData.error);
      }

      return {
        success: true,
        recipe: {
          title: recipeData.title || "",
          description: recipeData.description || "",
          category: "",
          servings: recipeData.servings || 2,
          prepTime: recipeData.prepTime || 0,
          cookTime: recipeData.cookTime || 0,
          ingredients: recipeData.ingredients || [],
          steps: recipeData.steps || [],
          tags: [],
          sourceUrl: input.url,
          imageUrl: scrapedImageUrl,
          images: scrapedImageUrl ? [scrapedImageUrl] : [],
        },
      };
    }),

  generateWithAI: protectedProcedure
    .input(z.object({
      dishName: z.string().min(1),
      servings: z.number().int().min(1),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const prompt = `Generate a recipe in JSON format for the following dish.

IMPORTANT:
- Detect the language of the dish name and write ALL text fields (title, description, ingredient names, step descriptions) in that SAME language.
- If the dish name is Chinese, you MUST output Simplified Chinese (简体中文, zh-Hans) only. Do NOT use Traditional Chinese.
- If it is in German, write everything in German. If it is in English, write everything in English.

Dish Name: ${input.dishName}
Servings: ${input.servings}
Description: ${input.description || 'No specific description'}

Return ONLY valid JSON with this exact structure (no tags field):
{
  "title": "dish name in detected language",
  "description": "brief description in detected language",
  "category": "breakfast|lunch|dinner|dessert",
  "servings": number,
  "prepTime": number (in minutes),
  "cookTime": number (in minutes),
  "ingredients": [{"name": "ingredient name in detected language", "amount": number, "unit": "g|ml|tbsp|tsp|piece"}],
  "steps": [{"number": 1, "description": "step description in detected language"}]
}`;

      let response;
      try {
        response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a professional chef. Generate recipes in valid JSON format only. Always detect the language of the dish name provided by the user and write all recipe content (title, description, ingredients, steps) in that exact same language. If the language is Chinese, always use Simplified Chinese (zh-Hans), never Traditional Chinese.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          responseFormat: { type: "json_object" },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown AI provider error";
        console.error("[AI Recipe] LLM request failed:", message);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `AI request failed: ${message}`,
        });
      }

      const responseContent = response.choices[0]?.message.content;
      const responseText = typeof responseContent === 'string' ? responseContent : "";
      let recipeData;
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found");
        recipeData = JSON.parse(jsonMatch[0]);
      } catch (error) {
        console.error("Failed to parse AI response:", responseText);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "AI returned invalid JSON. Try another model or API endpoint.",
        });
      }

      // Search for a food photo using Wikipedia Commons API (free, no key needed)
      // Two-step strategy:
      //   1. Direct title lookup (works for well-known dishes)
      //   2. Wikipedia search API fallback (for dishes without exact page)
      let recipeImageUrl: string | undefined;
      try {
        const dishTitle = recipeData.title || input.dishName;

        // Step 1: direct title lookup
        let thumbUrl = await getWikiThumb(dishTitle);

        // Step 2: if no image found, use Wikipedia search to find closest food article
        if (!thumbUrl) {
          const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(dishTitle + ' food recipe')}&srlimit=3&format=json`;
          const searchResp = await fetch(searchUrl, { headers: WIKI_HEADERS, signal: AbortSignal.timeout(8000) });
          if (searchResp.ok) {
            const searchData = await searchResp.json();
            const results: any[] = searchData?.query?.search || [];
            for (const result of results) {
              thumbUrl = await getWikiThumb(result.title);
              if (thumbUrl) {
                console.log(`[AI Recipe] Found image via search: "${result.title}" for dish "${dishTitle}"`);
                break;
              }
            }
          }
        }

        // Download and upload to S3
        if (thumbUrl) {
          const imgResp = await fetch(thumbUrl, { headers: WIKI_HEADERS, signal: AbortSignal.timeout(15000) });
          if (imgResp.ok) {
            const imgBuffer = Buffer.from(await imgResp.arrayBuffer());
            const contentType = imgResp.headers.get('content-type') || 'image/jpeg';
            const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
            const key = `recipe-images/ai-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
            const { url } = await storagePut(key, imgBuffer, contentType);
            recipeImageUrl = url;
            console.log(`[AI Recipe] Image uploaded to S3: ${url}`);
          }
        } else {
          console.warn(`[AI Recipe] No Wikipedia image found for: ${dishTitle}`);
        }
      } catch (e) {
        console.error("[AI Recipe] Failed to fetch image from Wikipedia:", e);
      }

      return {
        success: true,
        recipe: {
          title: recipeData.title || input.dishName,
          description: recipeData.description || "",
          category: "",
          servings: recipeData.servings || input.servings,
          prepTime: recipeData.prepTime || 15,
          cookTime: recipeData.cookTime || 30,
          ingredients: recipeData.ingredients || [],
          steps: recipeData.steps || [],
          tags: [],
          imageUrl: recipeImageUrl,
          images: recipeImageUrl ? [recipeImageUrl] : [],
        },
      };
    }),
});
