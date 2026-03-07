import { Recipe } from "@/types/recipe";
import { nanoid } from "nanoid";

export const sampleRecipes: Recipe[] = [
  {
    id: nanoid(),
    title: "Spaghetti Bolognese",
    description: "Ein klassisches italienisches Nudelgericht mit würziger Fleischsauce",
    category: "dinner",
    tags: ["italienisch", "klassisch", "comfort-food"],
    servings: 4,
    prepTime: 15,
    cookTime: 30,
    difficulty: "easy",
    imageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663407123189/Rxf5k8E5vvXYtGGv2mJZZf/recipe-hero-cooking-6S3z5huSRE2ATQm2PatXQF.webp",
    ingredients: [
      { id: nanoid(), name: "Spaghetti", amount: 400, unit: "g" },
      { id: nanoid(), name: "Hackfleisch (Rind)", amount: 500, unit: "g" },
      { id: nanoid(), name: "Zwiebeln", amount: 2, unit: "piece" },
      { id: nanoid(), name: "Knoblauch", amount: 3, unit: "piece" },
      { id: nanoid(), name: "Tomaten (gehackt)", amount: 800, unit: "g" },
      { id: nanoid(), name: "Tomatenmark", amount: 2, unit: "tbsp" },
      { id: nanoid(), name: "Olivenöl", amount: 3, unit: "tbsp" },
      { id: nanoid(), name: "Salz und Pfeffer", amount: 1, unit: "tsp" },
      { id: nanoid(), name: "Oregano", amount: 1, unit: "tsp" },
      { id: nanoid(), name: "Parmesan", amount: 100, unit: "g" },
    ],
    steps: [
      {
        id: nanoid(),
        number: 1,
        description: "Zwiebeln und Knoblauch fein hacken. Olivenöl in einer großen Pfanne erhitzen.",
        duration: 5,
      },
      {
        id: nanoid(),
        number: 2,
        description: "Zwiebeln und Knoblauch in das heiße Öl geben und 2-3 Minuten anbraten, bis sie duftend werden.",
        duration: 3,
      },
      {
        id: nanoid(),
        number: 3,
        description: "Hackfleisch hinzufügen und unter Rühren 5-7 Minuten braten, bis es braun ist.",
        duration: 7,
      },
      {
        id: nanoid(),
        number: 4,
        description: "Tomatenmark hinzufügen und 1 Minute mitbraten.",
        duration: 1,
      },
      {
        id: nanoid(),
        number: 5,
        description: "Gehackte Tomaten, Oregano, Salz und Pfeffer hinzufügen. Alles gut vermischen.",
        duration: 2,
      },
      {
        id: nanoid(),
        number: 6,
        description: "Die Sauce 20-25 Minuten köcheln lassen, bis sie schön eingedickt ist.",
        duration: 25,
      },
      {
        id: nanoid(),
        number: 7,
        description: "Währenddessen Wasser in einem großen Topf zum Kochen bringen und die Spaghetti nach Packungsanleitung kochen.",
        duration: 10,
      },
      {
        id: nanoid(),
        number: 8,
        description: "Spaghetti abgießen und auf Tellern anrichten. Mit der Bolognese-Sauce übergießen.",
        duration: 3,
      },
      {
        id: nanoid(),
        number: 9,
        description: "Mit frisch geriebenem Parmesan bestreuen und sofort servieren.",
        duration: 1,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: nanoid(),
    title: "Hähnchen-Stir-Fry",
    description: "Schnelles und gesundes asiatisches Wokgericht mit Gemüse und Hähnchen",
    category: "dinner",
    tags: ["asiatisch", "schnell", "gesund", "wok"],
    servings: 3,
    prepTime: 20,
    cookTime: 15,
    difficulty: "easy",
    imageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663407123189/Rxf5k8E5vvXYtGGv2mJZZf/recipe-ingredients-flat-crA8DkhZM8VgtQqB8AWm4b.webp",
    ingredients: [
      { id: nanoid(), name: "Hähnchenbrust", amount: 500, unit: "g" },
      { id: nanoid(), name: "Paprika (rot)", amount: 2, unit: "piece" },
      { id: nanoid(), name: "Brokkoli", amount: 300, unit: "g" },
      { id: nanoid(), name: "Karotten", amount: 2, unit: "piece" },
      { id: nanoid(), name: "Zwiebel", amount: 1, unit: "piece" },
      { id: nanoid(), name: "Knoblauch", amount: 2, unit: "piece" },
      { id: nanoid(), name: "Sojasauce", amount: 3, unit: "tbsp" },
      { id: nanoid(), name: "Sesamöl", amount: 1, unit: "tbsp" },
      { id: nanoid(), name: "Ingwer (gerieben)", amount: 1, unit: "tbsp" },
      { id: nanoid(), name: "Öl zum Braten", amount: 2, unit: "tbsp" },
    ],
    steps: [
      {
        id: nanoid(),
        number: 1,
        description: "Hähnchenbrust in mundgerechte Stücke schneiden. Gemüse waschen und in Stücke schneiden.",
        duration: 10,
      },
      {
        id: nanoid(),
        number: 2,
        description: "Knoblauch und Ingwer fein hacken.",
        duration: 3,
      },
      {
        id: nanoid(),
        number: 3,
        description: "Öl in einem Wok oder großer Pfanne stark erhitzen.",
        duration: 2,
      },
      {
        id: nanoid(),
        number: 4,
        description: "Hähnchenstücke hinzufügen und 5-7 Minuten braten, bis sie durchgegart sind. Herausnehmen.",
        duration: 7,
      },
      {
        id: nanoid(),
        number: 5,
        description: "Knoblauch und Ingwer in den Wok geben und 30 Sekunden anbraten.",
        duration: 1,
      },
      {
        id: nanoid(),
        number: 6,
        description: "Gemüse hinzufügen und 5-7 Minuten unter Rühren braten.",
        duration: 7,
      },
      {
        id: nanoid(),
        number: 7,
        description: "Hähnchen zurück in den Wok geben. Sojasauce und Sesamöl hinzufügen.",
        duration: 1,
      },
      {
        id: nanoid(),
        number: 8,
        description: "Alles gut vermischen und 1-2 Minuten kochen lassen.",
        duration: 2,
      },
      {
        id: nanoid(),
        number: 9,
        description: "Sofort servieren, am besten mit Reis oder Nudeln.",
        duration: 1,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function seedRecipesIfEmpty() {
  const stored = localStorage.getItem("recipes");
  if (!stored || JSON.parse(stored).length === 0) {
    localStorage.setItem("recipes", JSON.stringify(sampleRecipes));
  }
}
