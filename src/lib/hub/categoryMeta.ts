import type { HubCategory } from "./config";

export const HUB_CATEGORY_META: Record<
  HubCategory,
  { emoji: string; title: string; subtitle: string; sectionTitle: string; searchHint: string; layout: "list" | "grid" }
> = {
  food: {
    emoji: "🍛",
    title: "Good Food, Great Mood",
    subtitle: "Fresh meals, fast delivery",
    sectionTitle: "Popular Meals",
    searchHint: "Search meals…",
    layout: "list",
  },
  groceries: {
    emoji: "🥬",
    title: "Fresh & Affordable",
    subtitle: "Groceries delivered to your door",
    sectionTitle: "Fresh Picks",
    searchHint: "Search groceries…",
    layout: "grid",
  },
  drinks: {
    emoji: "🥤",
    title: "Stay Refreshed",
    subtitle: "Cold drinks, delivered fast",
    sectionTitle: "Popular Drinks",
    searchHint: "Search drinks…",
    layout: "grid",
  },
  marketplace: {
    emoji: "🛍️",
    title: "Shop Anything",
    subtitle: "Everyday items from trusted sellers",
    sectionTitle: "Marketplace Picks",
    searchHint: "Search products…",
    layout: "grid",
  },
};
