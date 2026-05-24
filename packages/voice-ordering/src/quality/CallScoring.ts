// ניקוד שיחות עם Claude — "האם הלקוח היה מרוצה?"
import Anthropic from '@anthropic-ai/sdk';
import type { CallScore, DialogTurn } from '../types.js';

export interface CallScoringConfig {
  apiKey: string;
  model?: string;
}

const SYSTEM_PROMPT = `אתה מבקר איכות לשיחות הזמנת אירועים בעברית.
דרג את השיחה לפי הקריטריונים הבאים, בסולם 0-100, והחזר JSON תקני בלבד:
{
  "overall": <ציון כללי>,
  "customerSatisfaction": <כמה הלקוח היה מרוצה>,
  "taskCompletion": <האם המשימה הושלמה בהצלחה>,
  "agentClarity": <עד כמה הבוט היה ברור ומועיל>,
  "notes": "<הסבר קצר בעברית>",
  "flagsForReview": ["<תיוג 1>", "<תיוג 2>"]
}
תיוגים אפשריים: "תלונה_אמיתית", "טון_כעוס", "בלבול_של_בוט", "הצלחה_מלאה", "צריך_מעקב".
החזר JSON בלבד.`;

export class CallScoring {
  private client: Anthropic;
  private model: string;

  constructor(cfg: CallScoringConfig) {
    this.client = new Anthropic({ apiKey: cfg.apiKey });
    this.model = cfg.model ?? 'claude-sonnet-4-7';
  }

  async score(transcript: DialogTurn[]): Promise<CallScore> {
    const text = transcript
      .map((t) => `${t.speaker === 'user' ? 'לקוח' : 'בוט'}: ${t.text}`)
      .join('\n');

    // beta endpoint עם prompt caching
    const msg = await this.client.beta.messages.create({
      model: this.model,
      max_tokens: 800,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: text }],
    });

    const raw = msg.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    try {
      const json = JSON.parse(extractJson(raw));
      return {
        overall: Number(json.overall ?? 0),
        customerSatisfaction: Number(json.customerSatisfaction ?? 0),
        taskCompletion: Number(json.taskCompletion ?? 0),
        agentClarity: Number(json.agentClarity ?? 0),
        notes: String(json.notes ?? ''),
        flagsForReview: Array.isArray(json.flagsForReview) ? json.flagsForReview.map(String) : [],
      };
    } catch {
      return {
        overall: 0,
        customerSatisfaction: 0,
        taskCompletion: 0,
        agentClarity: 0,
        notes: 'parse error',
        flagsForReview: ['scoring_failed'],
      };
    }
  }
}

function extractJson(text: string): string {
  const m = text.match(/\{[\s\S]*\}/);
  return m ? m[0] : text;
}
