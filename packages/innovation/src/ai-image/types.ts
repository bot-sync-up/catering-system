export interface MenuItemContext {
  id: string;
  nameHe: string;
  nameEn?: string;
  ingredientsHe?: string[];
  ingredientsEn?: string[];
  category?: "starter" | "main" | "dessert" | "side" | "drink";
  preferredAspect?: "1:1" | "4:3" | "16:9";
}

export interface GeneratedImage {
  itemId: string;
  url: string;
  /** רוחב בפיקסלים. */
  width: number;
  height: number;
  promptUsed: string;
  descriptionHe: string;
  model: string;
  /** מילישניות שלקח לג'נרציה. */
  durationMs: number;
  /** עלות מוערכת ב-USD (לחישוב חיוב פנימי). */
  estimatedCostUsd?: number;
}

export interface ImageGenProvider {
  name: string;
  generate(prompt: string, opts: {
    negativePrompt?: string;
    aspectRatio?: "1:1" | "4:3" | "16:9";
    seed?: number;
  }): Promise<{ url: string; width: number; height: number; estimatedCostUsd?: number }>;
}
