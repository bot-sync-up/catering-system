// סקר NPS — שיחה יוצאת אחרי האירוע
import { TwilioVoice } from '../telephony/TwilioVoice.js';

export interface SurveyPayload {
  customerName: string;
  customerPhone: string;
  eventDate: string;
}

export interface NPSResponse {
  callSid: string;
  score: number; // 0-10
  comment?: string;
  category: 'promoter' | 'passive' | 'detractor';
}

export function buildSurveyScript(payload: SurveyPayload): string {
  return `שלום ${payload.customerName}, מדברים מאולמי האירועים. אני מקווה שנהנית באירוע ב-${payload.eventDate}. נשמח אם תוכל לדרג את שביעות הרצון שלך בסולם מ-0 עד 10. אפשר להגיד את הציון בקול, או להקיש על המקלדת.`;
}

export function classifyNPS(score: number): NPSResponse['category'] {
  if (score >= 9) return 'promoter';
  if (score >= 7) return 'passive';
  return 'detractor';
}

export class SurveyCall {
  constructor(private twilio: TwilioVoice) {}

  async send(payload: SurveyPayload): Promise<string> {
    return this.twilio.dialOut(payload.customerPhone, { record: true });
  }
}
