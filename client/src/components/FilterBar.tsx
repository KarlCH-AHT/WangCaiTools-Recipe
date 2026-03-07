import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, X } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { Recipe } from "@/types/recipe";

interface FilterBarProps {
  recipes: Recipe[];
  onFilter: (filtered: Recipe[]) => void;
  categories: string[];
  tags: string[];
  viewModeSlot?: React.ReactNode;
}

type SortType = "name" | "date";

export default function FilterBar({ recipes, onFilter, categories, tags, viewModeSlot }: FilterBarProps) {
  const t = useTranslation();
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sortType, setSortType] = useState<SortType>("date");

  // Apply filters whenever any filter state changes
  useEffect(() => {
    let filtered = recipes;

    if (selectedCategory) {
      filtered = filtered.filter((r) => r.category === selectedCategory);
    }
    if (selectedTags.length > 0) {
      filtered = filtered.filter((r) =>
        selectedTags.some((tag) => r.tags?.includes(tag))
      );
    }
    if (showFavoritesOnly) {
      filtered = filtered.filter((r) => r.isFavorite);
    }
    if (sortType === "name") {
      filtered = [...filtered].sort((a, b) => a.title.localeCompare(b.title));
    } else {
      filtered = [...filtered].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    onFilter(filtered);
  }, [recipes, selectedCategory, selectedTags, showFavoritesOnly, sortType]);

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const hasActiveFilters = selectedCategory || selectedTags.length > 0 || showFavoritesOnly;

  const clearFilters = () => {
    setSelectedCategory(null);
    setSelectedTags([]);
    setShowFavoritesOnly(false);
    setSortType("date");
  };

  return (
    <div className="space-y-3 mb-6">
      {/* Filter Row */}
      <div className="flex gap-2 items-center flex-wrap">
        {/* Filter Toggle Button */}
        <Button
          variant={showFilters ? "default" : "outline"}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={`gap-2 ${
            showFilters
              ? "bg-primary text-primary-foreground"
              : hasActiveFilters
                ? "border-primary text-primary"
                : ""
          }`}
        >
          {t("filter")}
          <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
        </Button>

        {/* Sort Dropdown */}
        <Select value={sortType} onValueChange={(v) => setSortType(v as SortType)}>
          <SelectTrigger className="w-36 sm:w-44 h-8 text-xs sm:text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">{t("sortByDate")}</SelectItem>
            <SelectItem value="name">{t("sortByName")}</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="gap-1 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
            {t("clear") || "Clear"}
          </Button>
        )}

        {/* View Mode Slot - pushed to the right */}
        {viewModeSlot && (
          <div className="ml-auto flex gap-1">
            {viewModeSlot}
          </div>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="border border-border rounded-lg p-4 bg-muted/30 space-y-4">
          {/* Category Filter */}
          <div>
            <h3 className="font-medium mb-2 text-sm">{t("category")}</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
                className={selectedCategory === null ? "bg-primary text-primary-foreground" : ""}
              >
                {t("allCategories")}
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                  className={selectedCategory === cat ? "bg-primary text-primary-foreground" : ""}
                >
                  {t(cat) || cat}
                </Button>
              ))}
            </div>
          </div>

          {/* Tags Filter */}
          {tags.length > 0 && (
            <div>
              <h3 className="font-medium mb-2 text-sm">{t("tags")}</h3>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Button
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleTagToggle(tag)}
                    className={selectedTags.includes(tag) ? "bg-primary text-primary-foreground" : ""}
                  >
                    {t(tag) || tag}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Favorites Filter */}
          <div>
            <Button
              variant={showFavoritesOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={showFavoritesOnly ? "bg-primary text-primary-foreground" : ""}
            >
              ♥ {t("showFavoritesOnly")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
