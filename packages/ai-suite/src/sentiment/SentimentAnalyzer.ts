// SentimentAnalyzer — ניתוח רגש מבוסס Claude
// מותאם לעברית מודרנית כולל סלנג ישראלי

import { createMessage, extractText } from "../shared/anthropicClient.js";
import { cacheKey, cacheWrap } from "../cost/redisCache.js";

export type SentimentLabel =
  | "very_negative"
  | "negative"
  | "neutral"
  | "positive"
  | "very_positive";

export interface SentimentResult {
  label: SentimentLabel;
  score: number; // -1 .. +1
  confidence: number; // 0..1
  emotions: string[]; // לדוגמה: "אכזבה", "שמחה", "כעס"
  reasoning?: string;
}

const SYSTEM_PROMPT = `אתה מנתח רגש להודעות לקוחות בעברית עבור חברת קייטרינג.
החזר JSON בפורמט:
{
  "label": "very_negative|negative|neutral|positive|very_positive",
  "score": -1.0 to 1.0,
  "confidence": 0.0 to 1.0,
  "emotions": ["רגש1", "רגש2"],
  "reasoning": "הסבר קצר בעברית"
}
שים לב לסלנג ישראלי ("היה פצצה" = חיובי מאוד, "ככה ככה" = ניטרלי-שלילי, "אסון" = שלילי מאוד).
החזר רק JSON תקני, ללא טקסט נוסף.`;

export class SentimentAnalyzer {
  async analyze(text: string): Promise<SentimentResult> {
    const key = cacheKey("sentiment", text);
    return cacheWrap(key, 3600 * 24, async () => {
      const response = await createMessage({
        callerTag: "sentiment",
        maxTokens: 300,
        temperature: 0.1,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: `נתח: "${text}"` }],
      });
      const raw = extractText(response).trim();
      const cleaned = raw
        .replace(/^```json\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      try {
        const parsed = JSON.parse(cleaned) as SentimentResult;
        return parsed;
      } catch {
        return {
          label: "neutral",
          score: 0,
          confidence: 0,
          emotions: [],
          reasoning: "כשל בפענוח תגובה — ברירת מחדל",
        };
      }
    });
  }

  async analyzeBatch(texts: string[]): Promise<SentimentResult[]> {
    return Promise.all(texts.map((t) => this.analyze(t)));
  }
}
