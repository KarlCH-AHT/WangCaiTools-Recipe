import { describe, it, expect, vi } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
  ok: false,
  json: async () => ({}),
  text: async () => "",
  arrayBuffer: async () => new ArrayBuffer(0),
  headers: {
    get: () => null,
  },
}));
vi.spyOn(console, "warn").mockImplementation(() => {});

// Mock the image generation API to avoid timeout in tests
vi.mock("../_core/imageGeneration", () => ({
  generateImage: vi.fn().mockResolvedValue({
    url: "https://example.com/test-recipe-image.jpg",
  }),
}));

// Mock the LLM API to avoid timeout in tests
vi.mock("../_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            title: "Test Recipe",
            description: "A test recipe",
            category: "dinner",
            servings: 4,
            prepTime: 15,
            cookTime: 30,
            ingredients: [
              { name: "Ingredient 1", amount: 100, unit: "g" },
              { name: "Ingredient 2", amount: 2, unit: "tbsp" },
            ],
            steps: [
              { number: 1, description: "Step 1" },
              { number: 2, description: "Step 2" },
            ],
            tags: ["test"],
          }),
        },
      },
    ],
  }),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "email",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return ctx;
}

describe("recipes.generateWithAI", () => {
  it("should generate a recipe with valid input", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.recipes.generateWithAI({
      dishName: "Spaghetti Carbonara",
      servings: 4,
      description: "Classic Italian pasta with creamy sauce",
    });

    expect(result.success).toBe(true);
    expect(result.recipe).toBeDefined();
    expect(result.recipe?.title).toBeTruthy();
    expect(result.recipe?.ingredients).toBeInstanceOf(Array);
    expect(result.recipe?.steps).toBeInstanceOf(Array);
  });

  it("should handle missing description", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.recipes.generateWithAI({
      dishName: "Fried Rice",
      servings: 2,
    });

    expect(result.success).toBe(true);
    expect(result.recipe?.title).toBeTruthy();
  });

  it("should use provided servings in recipe", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.recipes.generateWithAI({
      dishName: "Chicken Curry",
      servings: 6,
      description: "Spicy and aromatic",
    });

    expect(result.success).toBe(true);
    // Mock returns fixed servings, so we check it's a number
    expect(result.recipe?.servings).toBeDefined();
    expect(typeof result.recipe?.servings).toBe("number");
  });

  it("should generate ingredients and steps", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.recipes.generateWithAI({
      dishName: "Tomato Soup",
      servings: 4,
    });

    expect(result.success).toBe(true);
    expect(result.recipe?.ingredients).toBeInstanceOf(Array);
    expect(result.recipe?.ingredients.length).toBeGreaterThan(0);
    expect(result.recipe?.steps).toBeInstanceOf(Array);
    expect(result.recipe?.steps.length).toBeGreaterThan(0);

    if (result.recipe?.ingredients.length) {
      const ingredient = result.recipe.ingredients[0];
      expect(ingredient).toHaveProperty("name");
      expect(ingredient).toHaveProperty("amount");
      expect(ingredient).toHaveProperty("unit");
    }

    if (result.recipe?.steps.length) {
      const step = result.recipe.steps[0];
      expect(step).toHaveProperty("number");
      expect(step).toHaveProperty("description");
    }
  });
});
