/**
 * KitchenVoice
 *
 * מנוע פקודות קוליות hands-free למטבח. בנוי סביב Web Speech API
 * (SpeechRecognition) — נתמך טוב ב-Chrome / Edge עדכניים, גם בעברית (`he-IL`).
 *
 * אנו לא מטפלים ב-UI — רק במנגנון: התחל/עצור הקלטה, פרסר טקסט -> Intent,
 * אירוע `command` עם ה-Intent וה-payload.
 *
 * הסיבה שזה לא קומפוננטת React: נרצה להפעיל אותו גם ב-Service Worker /
 * Electron / מסך מטבח דמוי-קיוסק שלא בהכרח רץ React.
 */

export type KitchenIntent =
  | { kind: "mark-completed"; taskId?: string }
  | { kind: "add-note"; note: string }
  | { kind: "next-task" }
  | { kind: "call-waiter"; tableId?: string }
  | { kind: "unknown"; rawText: string };

export interface KitchenVoiceOptions {
  /** קוד שפה — ברירת מחדל he-IL. */
  lang?: string;
  /** האם להמשיך להקליט אחרי כל תוצאה (continuous). */
  continuous?: boolean;
  /** ה-Web Speech API (לבחירה / הזרקה לבדיקות). */
  recognizerFactory?: () => SpeechRecognitionLike;
}

export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type Listener = (intent: KitchenIntent, rawText: string) => void;

export class KitchenVoice {
  private recognizer: SpeechRecognitionLike | null = null;
  private listeners: Listener[] = [];
  private options: Required<Omit<KitchenVoiceOptions, "recognizerFactory">> & Pick<KitchenVoiceOptions, "recognizerFactory">;
  private active = false;

  constructor(opts: KitchenVoiceOptions = {}) {
    this.options = {
      lang: opts.lang ?? "he-IL",
      continuous: opts.continuous ?? true,
      recognizerFactory: opts.recognizerFactory,
    };
  }

  /** מתחיל להקשיב. זורק אם הדפדפן לא תומך. */
  start(): void {
    if (this.active) return;
    this.recognizer = this.options.recognizerFactory
      ? this.options.recognizerFactory()
      : createBrowserRecognizer();
    if (!this.recognizer) {
      throw new Error("VOICE_UNSUPPORTED");
    }
    this.recognizer.lang = this.options.lang;
    this.recognizer.continuous = this.options.continuous;
    this.recognizer.interimResults = false;
    this.recognizer.onresult = (ev) => {
      const result = ev.results[ev.results.length - 1];
      const transcript = result[0]?.transcript?.trim() ?? "";
      if (!transcript) return;
      const intent = parseHebrewCommand(transcript);
      for (const l of this.listeners) l(intent, transcript);
    };
    this.recognizer.onerror = () => {
      /* מתעלמים — onend יקרא ויאתחל */
    };
    this.recognizer.onend = () => {
      if (this.active && this.options.continuous) {
        try {
          this.recognizer?.start();
        } catch {
          /* יקרה כש-still active — ה-API לפעמים זורק */
        }
      }
    };
    this.recognizer.start();
    this.active = true;
  }

  stop(): void {
    this.active = false;
    this.recognizer?.stop();
    this.recognizer = null;
  }

  on(listener: Listener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
}

/** פרסר ישיר — שימושי לבדיקות בלי microphone. */
export function parseHebrewCommand(rawText: string): KitchenIntent {
  const t = rawText.replace(/[״"'`]/g, "").trim();

  if (/(סמן הושלם|סיימתי|הושלם|בוצע|מוכן)/.test(t)) {
    const taskId = extractTaskId(t);
    return { kind: "mark-completed", taskId };
  }
  if (/(הוסף הערה|הערה)/.test(t)) {
    const note = t.replace(/^(הוסף הערה|הערה)[: ]*/, "").trim();
    return { kind: "add-note", note };
  }
  if (/(משימה הבאה|הבא|הבאה|המשך)/.test(t)) {
    return { kind: "next-task" };
  }
  if (/(התקשר מלצר|קרא מלצר|מלצר)/.test(t)) {
    const m = t.match(/שולחן\s*(\d+)/);
    return { kind: "call-waiter", tableId: m?.[1] };
  }
  return { kind: "unknown", rawText: t };
}

function extractTaskId(text: string): string | undefined {
  const m = text.match(/(?:משימה|הזמנה|task)\s*(?:מספר\s*)?(\d{1,6})/i);
  return m?.[1];
}

function createBrowserRecognizer(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}
