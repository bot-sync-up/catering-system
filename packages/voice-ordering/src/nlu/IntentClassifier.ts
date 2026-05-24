// סיווג כוונה באמצעות Claude — קל, מהיר, עברית
import Anthropic from '@anthropic-ai/sdk';
import type { Intent } from '../types.js';

export interface IntentClassifierConfig {
  apiKey: string;
  model?: string; // ברירת מחדל: claude-haiku-4-7
}

const SYSTEM_PROMPT = `אתה מסווג כוונות לבוט הזמנות אירועים בעברית.
החזר JSON תקני בלבד:
{"intent": "<אחד מהבאים>", "confidence": <0-1>}

הכוונות הקיימות:
- ORDER_NEW: הזמנה חדשה של אירוע
- ORDER_STATUS: שאלה על סטטוס הזמנה קיימת
- CANCEL: ביטול הזמנה
- COMPLAINT: תלונה / טענה
- INFO: שאלה כללית (מחירים, זמינות, תפריט)
- HUMAN_HELP: בקשה לדבר עם נציג אנושי
- UNKNOWN: לא ברור

החזר JSON בלבד, ללא טקסט נוסף.`;

export class IntentClassifier {
  private client: Anthropic;
  private model: string;

  constructor(cfg: IntentClassifierConfig) {
    this.client = new Anthropic({ apiKey: cfg.apiKey });
    this.model = cfg.model ?? 'claude-haiku-4-7';
  }

  async classify(userText: string): Promise<{ intent: Intent; confidence: number }> {
    // beta endpoint עם prompt caching של ה-system על הפרומפט הגנרי
    const msg = await this.client.beta.messages.create({
      model: this.model,
      max_tokens: 100,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userText }],
    });

    const text = msg.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    try {
      const json = JSON.parse(extractJson(text));
      return {
        intent: (json.intent as Intent) ?? 'UNKNOWN',
        confidence: Number(json.confidence ?? 0.5),
      };
    } catch {
      return { intent: 'UNKNOWN', confidence: 0 };
    }
  }
}

function extractJson(text: string): string {
  const m = text.match(/\{[\s\S]*\}/);
  return m ? m[0] : text;
}
