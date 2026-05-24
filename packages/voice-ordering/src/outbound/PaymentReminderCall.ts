// תזכורת תשלום — שיחה יוצאת על חוב פתוח
import { TwilioVoice } from '../telephony/TwilioVoice.js';

export interface PaymentReminderPayload {
  customerName: string;
  customerPhone: string;
  amount: number;
  currency?: string; // ILS ברירת מחדל
  dueDate: string; // ISO
  paymentLink?: string;
}

export function buildPaymentScript(payload: PaymentReminderPayload): string {
  const currency = payload.currency ?? 'שקלים';
  const link = payload.paymentLink ? ` נשלח אליך לינק תשלום ב-SMS.` : '';
  return `שלום ${payload.customerName}, מדברים ממחלקת הגביה. אנחנו רוצים להזכיר שיש יתרה לתשלום של ${payload.amount} ${currency} לתאריך ${payload.dueDate}.${link} אם כבר שילמת, נא להתעלם. תודה!`;
}

export class PaymentReminderCall {
  constructor(private twilio: TwilioVoice) {}

  async send(payload: PaymentReminderPayload): Promise<string> {
    return this.twilio.dialOut(payload.customerPhone, { record: true });
  }
}
