// חילוץ ישויות מהזמנת אירוע בעברית
import Anthropic from '@anthropic-ai/sdk';
import type { ExtractedEntities, EventType } from '../types.js';
import { parseHebrewNumber } from './HebrewNumberParser.js';
import { parseHebrewDate } from './HebrewDateParser.js';

export interface EntityExtractorConfig {
  apiKey: string;
  model?: string;
}

const EVENT_KEYWORDS: Array<[RegExp, EventType]> = [
  [/חתונה|אירוע נישואין/, 'wedding'],
  [/בר[\s-]?מצוו?ה/, 'bar_mitzvah'],
  [/בת[\s-]?מצוו?ה/, 'bat_mitzvah'],
  [/ברית\s?מילה|ברית/, 'brit'],
  [/אירוסין|תנאים/, 'engagement'],
  [/שבע ברכות/, 'sheva_brachot'],
  [/יום הולדת/, 'birthday'],
  [/כנס|אירוע חברה|אירוע עסקי/, 'corporate'],
];

const SYSTEM_PROMPT = `חלץ ישויות מהודעת לקוח בעברית להזמנת אירוע. החזר JSON בלבד עם השדות:
{
  "customerName": "<שם הלקוח>",
  "customerPhone": "<טלפון>",
  "eventType": "<wedding|bar_mitzvah|bat_mitzvah|brit|engagement|sheva_brachot|corporate|birthday|other>",
  "date": "<טקסט תאריך כפי שאמר הלקוח>",
  "time": "<שעה HH:MM>",
  "guestCount": "<מספר אורחים כטקסט>",
  "menuItems": ["<פריט תפריט 1>", "<פריט תפריט 2>"],
  "allergies": ["<אלרגיה 1>"],
  "location": "<מקום>",
  "notes": "<הערות נוספות>"
}
שדה ריק => null. החזר JSON תקני בלבד, ללא טקסט נוסף.`;

export class EntityExtractor {
  private client: Anthropic;
  private model: string;

  constructor(cfg: EntityExtractorConfig) {
    this.client = new Anthropic({ apiKey: cfg.apiKey });
    this.model = cfg.model ?? 'claude-haiku-4-7';
  }

  async extract(userText: string, referenceDate = new Date()): Promise<ExtractedEntities> {
    // beta endpoint עם prompt caching של ה-system
    const msg = await this.client.beta.messages.create({
      model: this.model,
      max_tokens: 500,
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

    let raw: Record<string, unknown> = {};
    try {
      raw = JSON.parse(extractJson(text));
    } catch {
      // fallback — חילוץ בכלים מקומיים בלבד
    }

    return this.normalize(raw, userText, referenceDate);
  }

  /** נורמליזציה — תאריכים למבנה ISO, מספרים למספרים, וזיהוי גיבוי על בסיס regex */
  private normalize(
    raw: Record<string, unknown>,
    userText: string,
    referenceDate: Date
  ): ExtractedEntities {
    const out: ExtractedEntities = {};

    if (raw.customerName) out.customerName = String(raw.customerName);
    if (raw.customerPhone) out.customerPhone = String(raw.customerPhone);
    if (raw.location) out.location = String(raw.location);
    if (raw.notes) out.notes = String(raw.notes);
    if (raw.time) out.time = String(raw.time);

    if (raw.menuItems && Array.isArray(raw.menuItems)) {
      out.menuItems = raw.menuItems.map(String);
    }
    if (raw.allergies && Array.isArray(raw.allergies)) {
      out.allergies = raw.allergies.map(String);
    }

    // eventType — קודם מ-Claude, אחרת fallback ל-regex
    if (raw.eventType) {
      out.eventType = String(raw.eventType) as EventType;
    } else {
      for (const [re, type] of EVENT_KEYWORDS) {
        if (re.test(userText)) {
          out.eventType = type;
          break;
        }
      }
    }

    // date — נסה לפענח עברית
    if (raw.date) {
      const iso = parseHebrewDate(String(raw.date), referenceDate);
      out.date = iso ?? String(raw.date);
    }

    // guestCount — מספר בעברית או רגיל
    if (raw.guestCount != null) {
      const asNum = Number(raw.guestCount);
      if (!isNaN(asNum) && asNum > 0) {
        out.guestCount = asNum;
      } else {
        const parsed = parseHebrewNumber(String(raw.guestCount));
        if (parsed) out.guestCount = parsed;
      }
    }

    return out;
  }
}

function extractJson(text: string): string {
  const m = text.match(/\{[\s\S]*\}/);
  return m ? m[0] : text;
}
