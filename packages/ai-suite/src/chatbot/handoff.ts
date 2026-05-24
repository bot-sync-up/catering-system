// ניהול handoff מבוט לאדם
// שמירת context, סיכום השיחה, ויצירת כרטיס תמיכה

import { createMessage, extractText } from "../shared/anthropicClient.js";

export type HandoffReason =
  | "complaint"
  | "bereavement"
  | "large_event"
  | "customer_request"
  | "low_confidence"
  | "other";

export type Priority = "low" | "normal" | "high" | "urgent";

export interface HandoffTicket {
  ticketId: string;
  reason: HandoffReason;
  priority: Priority;
  customerSummary: string; // עברית — סיכום עבור הנציג
  fullTranscript: Array<{ role: string; content: string }>;
  createdAt: Date;
  estimatedResponseMinutes: number;
}

export interface HandoffSink {
  /** מקבל ticket חדש ושומר ב-CRM/Helpdesk */
  submit(ticket: HandoffTicket): Promise<void>;
}

const PRIORITY_SLA_MIN: Record<Priority, number> = {
  urgent: 5,
  high: 15,
  normal: 60,
  low: 240,
};

/**
 * מסכם שיחה ארוכה לפסקה אחת לנציג.
 * משתמש ב-Claude כדי לחלץ את העיקר.
 */
export async function summarizeForAgent(
  transcript: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<string> {
  if (transcript.length === 0) return "(אין תוכן בשיחה)";

  const transcriptText = transcript
    .map((m) => `${m.role === "user" ? "לקוח" : "בוט"}: ${m.content}`)
    .join("\n");

  const response = await createMessage({
    callerTag: "handoff_summary",
    maxTokens: 400,
    temperature: 0.3,
    system:
      "אתה מסכם שיחות שירות לקוחות עבור נציג אנושי שמקבל את הטיפול. כתוב בעברית, בפסקה אחת, את הנקודות העיקריות: מה הלקוח רצה, מה כבר נעשה, מה דחוף.",
    messages: [
      {
        role: "user",
        content: `סכם את השיחה הבאה לפסקה אחת לנציג:\n\n${transcriptText}`,
      },
    ],
  });

  return extractText(response);
}

let _ticketCounter = 1000;

export async function createHandoffTicket(opts: {
  reason: HandoffReason;
  priority: Priority;
  transcript: Array<{ role: "user" | "assistant"; content: string }>;
  customerId?: string;
  sink?: HandoffSink;
}): Promise<HandoffTicket> {
  const summary = await summarizeForAgent(opts.transcript);
  const ticket: HandoffTicket = {
    ticketId: `HND-${_ticketCounter++}`,
    reason: opts.reason,
    priority: opts.priority,
    customerSummary: summary,
    fullTranscript: opts.transcript,
    createdAt: new Date(),
    estimatedResponseMinutes: PRIORITY_SLA_MIN[opts.priority],
  };

  if (opts.sink) {
    await opts.sink.submit(ticket);
  }

  return ticket;
}

/**
 * בודק האם הודעה אחת מצדיקה escalation מיידי על סמך מילות מפתח.
 */
export function shouldAutoEscalate(message: string): {
  escalate: boolean;
  reason?: HandoffReason;
  priority?: Priority;
} {
  const m = message.toLowerCase();
  // אבל
  if (/אזכרה|שבעה|אבל|נפטר|הלוויה/.test(m)) {
    return { escalate: true, reason: "bereavement", priority: "high" };
  }
  // תלונה חמורה
  if (/תביעה|משטרה|עורך דין|התמסמסתי|הרעלה/.test(m)) {
    return { escalate: true, reason: "complaint", priority: "urgent" };
  }
  return { escalate: false };
}
