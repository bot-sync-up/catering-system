// Topic extractor — מסווג משוב למגוון נושאי קייטרינג
// קטגוריות: אוכל, שירות, מחיר, איחור, מתקנים, כשרות, אחר

import { createMessage, extractText } from "../shared/anthropicClient.js";
import { cacheKey, cacheWrap } from "../cost/redisCache.js";

export type Topic =
  | "food_quality"
  | "service"
  | "price"
  | "delay"
  | "facility"
  | "kosher"
  | "presentation"
  | "communication"
  | "other";

const TOPIC_LABEL_HE: Record<Topic, string> = {
  food_quality: "אוכל",
  service: "שירות",
  price: "מחיר",
  delay: "איחור",
  facility: "מתקנים",
  kosher: "כשרות",
  presentation: "הגשה",
  communication: "תקשורת",
  other: "אחר",
};

export interface TopicResult {
  topics: Array<{ topic: Topic; label: string; weight: number }>;
}

const SYSTEM = `אתה מסווג נושאים בהודעות לקוחות (משוב/תלונה/שבח) של חברת קייטרינג ישראלית.
קטגוריות אפשריות: food_quality, service, price, delay, facility, kosher, presentation, communication, other.
החזר JSON בלבד: {"topics": [{"topic": "...", "weight": 0-1}]}
משקלים יסכמו ל-1 לכל היותר. לכלול רק נושאים שבאמת מופיעים.`;

export class TopicExtractor {
  async extract(text: string): Promise<TopicResult> {
    const key = cacheKey("topics", text);
    return cacheWrap(key, 3600 * 24, async () => {
      const response = await createMessage({
        callerTag: "topic_extract",
        maxTokens: 250,
        temperature: 0.1,
        system: SYSTEM,
        messages: [{ role: "user", content: text }],
      });
      const raw = extractText(response)
        .trim()
        .replace(/^```json\s*/i, "")
        .replace(/```\s*$/i, "");
      try {
        const parsed = JSON.parse(raw) as {
          topics: Array<{ topic: Topic; weight: number }>;
        };
        return {
          topics: parsed.topics.map((t) => ({
            topic: t.topic,
            label: TOPIC_LABEL_HE[t.topic] ?? t.topic,
            weight: t.weight,
          })),
        };
      } catch {
        return { topics: [{ topic: "other", label: "אחר", weight: 1 }] };
      }
    });
  }
}
