/**
 * MenuImageGenerator
 *
 * אחראי על:
 *  1. בניית פרומפט לפריט תפריט (`promptTemplates.ts`).
 *  2. הזמנת תמונה ממודל ג'נרטיבי (Stable Diffusion — stub כברירת מחדל).
 *  3. הוצאת תיאור עברי איכותי לתמונה באמצעות Anthropic Vision (אם יש מפתח).
 *  4. תמיכה ב-bulk generation עם concurrency control.
 */

import Anthropic from "@anthropic-ai/sdk";
import { buildMenuImagePrompt, type PromptStyle } from "./promptTemplates.js";
import type { GeneratedImage, ImageGenProvider, MenuItemContext } from "./types.js";

/** ספק ברירת מחדל — stub שמחזיר placeholder URL. */
export class StableDiffusionStubProvider implements ImageGenProvider {
  name = "stable-diffusion-stub";
  async generate(
    prompt: string,
    opts: { aspectRatio?: "1:1" | "4:3" | "16:9"; seed?: number } = {},
  ): Promise<{ url: string; width: number; height: number; estimatedCostUsd?: number }> {
    const [w, h] = opts.aspectRatio === "16:9" ? [1280, 720] : opts.aspectRatio === "4:3" ? [1024, 768] : [1024, 1024];
    // placeholder דטרמיניסטי — מאפשר בדיקות יציבות.
    const seed = opts.seed ?? Math.abs(hashCode(prompt)) % 100000;
    return {
      url: `https://picsum.photos/seed/${seed}/${w}/${h}`,
      width: w,
      height: h,
      estimatedCostUsd: 0,
    };
  }
}

export interface MenuImageGeneratorOptions {
  provider?: ImageGenProvider;
  /** מפתח Anthropic — לתיאורים בעברית באמצעות Vision. אופציונלי. */
  anthropicApiKey?: string;
  /** מקסימום ג'נרציות במקביל בעת bulk. */
  concurrency?: number;
}

export class MenuImageGenerator {
  private provider: ImageGenProvider;
  private anthropic?: Anthropic;
  private concurrency: number;

  constructor(opts: MenuImageGeneratorOptions = {}) {
    this.provider = opts.provider ?? new StableDiffusionStubProvider();
    if (opts.anthropicApiKey) {
      this.anthropic = new Anthropic({ apiKey: opts.anthropicApiKey });
    }
    this.concurrency = opts.concurrency ?? 3;
  }

  async generateForItem(
    item: MenuItemContext,
    style: PromptStyle = "studio",
  ): Promise<GeneratedImage> {
    const start = Date.now();
    const promptResult = buildMenuImagePrompt(item, style);
    const gen = await this.provider.generate(promptResult.prompt, {
      negativePrompt: promptResult.negativePrompt,
      aspectRatio: promptResult.aspectRatio,
    });

    let descriptionHe = promptResult.descriptionHe;
    if (this.anthropic) {
      try {
        descriptionHe = await this.describeImageHe(gen.url, item);
      } catch {
        // נופלים חזרה לתיאור הסטטי
      }
    }

    return {
      itemId: item.id,
      url: gen.url,
      width: gen.width,
      height: gen.height,
      promptUsed: promptResult.prompt,
      descriptionHe,
      model: this.provider.name,
      durationMs: Date.now() - start,
      estimatedCostUsd: gen.estimatedCostUsd,
    };
  }

  async generateBulk(
    items: MenuItemContext[],
    styleResolver: (item: MenuItemContext) => PromptStyle = () => "studio",
  ): Promise<GeneratedImage[]> {
    const results: GeneratedImage[] = new Array(items.length);
    let i = 0;
    const workers: Promise<void>[] = [];
    const next = async () => {
      while (true) {
        const idx = i++;
        if (idx >= items.length) return;
        results[idx] = await this.generateForItem(items[idx], styleResolver(items[idx]));
      }
    };
    for (let w = 0; w < Math.min(this.concurrency, items.length); w++) {
      workers.push(next());
    }
    await Promise.all(workers);
    return results;
  }

  /** מבקש מ-Claude לתאר את התמונה בעברית — שימושי לתיאור-מנה אוטומטי בתפריט. */
  private async describeImageHe(imageUrl: string, item: MenuItemContext): Promise<string> {
    if (!this.anthropic) throw new Error("Anthropic client not configured");
    const resp = await this.anthropic.messages.create({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "url", url: imageUrl } as never,
            },
            {
              type: "text",
              text: `כתוב תיאור עברי קצר וקולח (עד 25 מילים) לפריט התפריט "${item.nameHe}" המוצג בתמונה. בלי אימוג'ים, בלי שמות מותגים.`,
            },
          ],
        },
      ],
    });
    const block = resp.content.find((c) => c.type === "text");
    return block && block.type === "text" ? block.text.trim() : item.nameHe;
  }
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}
