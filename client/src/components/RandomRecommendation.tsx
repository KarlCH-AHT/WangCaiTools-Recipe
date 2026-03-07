import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shuffle } from "lucide-react";
import { Recipe } from "@/types/recipe";
import { useTranslation } from "@/hooks/useTranslation";

interface RandomRecommendationProps {
  recipes: Recipe[];
  onSelectRecipe: (recipe: Recipe) => void;
}

export default function RandomRecommendation({
  recipes,
  onSelectRecipe,
}: RandomRecommendationProps) {
  const t = useTranslation();
  const [recommendations, setRecommendations] = useState<Recipe[]>([]);
  const [showRecommendation, setShowRecommendation] = useState(false);

  const getRandomRecipes = () => {
    if (recipes.length === 0) return [];
    
    const shuffled = [...recipes].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(2, recipes.length));
  };

  const handleGetRecommendation = () => {
    const newRecommendations = getRandomRecipes();
    setRecommendations(newRecommendations);
    setShowRecommendation(true);
  };

  const handleTryAgain = () => {
    handleGetRecommendation();
  };

  if (recipes.length === 0) return null;

  return (
    <div className="mb-8">
      {!showRecommendation ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shuffle className="w-5 h-5 text-primary" />
              {t("randomRecommendation")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {t("getRecommendation") || "Get random recipe suggestions"}
            </p>
            <Button
              onClick={handleGetRecommendation}
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Shuffle className="w-4 h-4" />
              {t("getRecommendation")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Shuffle className="w-5 h-5 text-primary" />
              {t("randomRecommendation")}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTryAgain}
              className="gap-1"
            >
              <Shuffle className="w-4 h-4" />
              {t("tryAgain")}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.map((recipe) => (
              <Card
                key={recipe.id}
                className="overflow-hidden hover:shadow-lg transition-shadow duration-200 group cursor-pointer"
              >
                {recipe.imageUrl && (
                  <div className="h-40 overflow-hidden bg-muted">
                    <img
                      src={recipe.imageUrl}
                      alt={recipe.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="line-clamp-2">{recipe.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recipe.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {recipe.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {recipe.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="inline-block px-2 py-1 text-xs bg-primary/10 text-primary rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <Button
                    onClick={() => {
                      onSelectRecipe(recipe);
                      setShowRecommendation(false);
                    }}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {t("addToMenu")}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
