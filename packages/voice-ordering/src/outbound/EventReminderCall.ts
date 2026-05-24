// שיחה יוצאת — תזכורת לאירוע (יום-יומיים לפני)
import { TwilioVoice } from '../telephony/TwilioVoice.js';

export interface ReminderPayload {
  customerName: string;
  customerPhone: string;
  eventType: string;
  eventDate: string; // ISO
  eventTime?: string;
  guestCount?: number;
}

export function buildReminderScript(payload: ReminderPayload): string {
  const datePart = formatHebrewDate(payload.eventDate);
  const time = payload.eventTime ?? '';
  const guests = payload.guestCount ? ` ל-${payload.guestCount} אורחים` : '';
  return `שלום ${payload.customerName}, מדברים מאולמי האירועים. אנחנו רוצים להזכיר ש${payload.eventType} שלך מתוכנן ל${datePart} ${time}${guests}. אם יש שינויים — אנא צרו קשר. נתראה!`;
}

function formatHebrewDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' });
  } catch {
    return iso;
  }
}

export class EventReminderCall {
  constructor(private twilio: TwilioVoice) {}

  async send(payload: ReminderPayload): Promise<string> {
    return this.twilio.dialOut(payload.customerPhone);
  }
}
