/**
 * PlateQualityAnalyzer
 *
 * שולח תמונה של מנה ל-Claude Vision ומבקש ציון 0–10 בארבעה צירים:
 *  • presentation — כללי, ראשוני
 *  • portion — האם הכמות נראית סבירה
 *  • plating — אסתטיקה, חלוקה, צבעוניות
 *  • freshness — האם המאכלים נראים טריים
 *
 * אם ממוצע הציונים נמוך מ-7, מוחזר `alert: true` עם הודעה בעברית.
 */

import Anthropic from "@anthropic-ai/sdk";

export interface PlateQualityScores {
  presentation: number;
  portion: number;
  plating: number;
  freshness: number;
}

export interface PlateQualityResult {
  scores: PlateQualityScores;
  averageScore: number;
  alert: boolean;
  /** הסבר עברי קצר מצד המודל — מציין מה לתקן. */
  notesHe: string;
  /** מודל ששימש בפועל. */
  model: string;
  durationMs: number;
}

export interface PlateQualityAnalyzerOptions {
  apiKey: string;
  /** ברירת מחדל: claude-3-5-sonnet-latest. */
  model?: string;
  /** סף מתחתיו מוחזר alert. ברירת מחדל 7. */
  alertThreshold?: number;
}

const PROMPT_HE = `אתה שף בכיר שמעריך הגשת מנה לפי תמונה.
הערך כל ציר בסולם 0–10 (מספר שלם, 10 = מושלם):
- presentation — רושם כללי לקוח
- portion — האם גודל המנה מתאים
- plating — אסתטיקה, סידור, צבעוניות
- freshness — האם המאכלים נראים טריים

ענה ב-JSON תקני בלבד, ללא הסברים מחוץ ל-JSON, בפורמט:
{"presentation": 0-10, "portion": 0-10, "plating": 0-10, "freshness": 0-10, "notesHe": "הסבר קצר בעברית, עד 30 מילים"}`;

export class PlateQualityAnalyzer {
  private client: Anthropic;
  private model: string;
  private alertThreshold: number;

  constructor(opts: PlateQualityAnalyzerOptions) {
    this.client = new Anthropic({ apiKey: opts.apiKey });
    this.model = opts.model ?? "claude-3-5-sonnet-latest";
    this.alertThreshold = opts.alertThreshold ?? 7;
  }

  /** מקבל URL של תמונה (HTTPS) או base64 (data:image/jpeg;base64,...). */
  async analyzeByUrl(imageUrl: string): Promise<PlateQualityResult> {
    return this.analyze({ type: "url", url: imageUrl });
  }

  async analyzeByBase64(base64: string, mediaType: "image/jpeg" | "image/png" | "image/webp" = "image/jpeg"): Promise<PlateQualityResult> {
    return this.analyze({ type: "base64", media_type: mediaType, data: base64 });
  }

  private async analyze(source: { type: "url"; url: string } | { type: "base64"; media_type: string; data: string }): Promise<PlateQualityResult> {
    const start = Date.now();
    const resp = await this.client.messages.create({
      model: this.model,
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: source as never },
            { type: "text", text: PROMPT_HE },
          ],
        },
      ],
    });
    const block = resp.content.find((c) => c.type === "text");
    const raw = block && block.type === "text" ? block.text : "";
    const parsed = parseJsonFromText(raw);
    const scores: PlateQualityScores = {
      presentation: clampScore(parsed.presentation),
      portion: clampScore(parsed.portion),
      plating: clampScore(parsed.plating),
      freshness: clampScore(parsed.freshness),
    };
    const averageScore =
      (scores.presentation + scores.portion + scores.plating + scores.freshness) / 4;
    return {
      scores,
      averageScore: Math.round(averageScore * 10) / 10,
      alert: averageScore < this.alertThreshold,
      notesHe: typeof parsed.notesHe === "string" ? parsed.notesHe : "",
      model: this.model,
      durationMs: Date.now() - start,
    };
  }
}

function clampScore(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(10, Math.round(n)));
}

/** מנסה לחלץ את ה-JSON הראשון מתוך טקסט שעלול להיות מוקף נימוקים. */
export function parseJsonFromText(text: string): Record<string, unknown> {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return {};
  try {
    return JSON.parse(m[0]) as Record<string, unknown>;
  } catch {
    return {};
  }
}
