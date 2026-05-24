/**
 * WhatsApp message templates — these are the *logical* references we
 * use locally. Each one MUST also be pre-approved in the Meta Business
 * Manager under the exact same `name` and `languageCode`.
 *
 * `variables` are ordered — Meta substitutes them as {{1}}, {{2}}, etc.
 * Our send pipeline maps merge-field names to positional parameters.
 */

export interface WhatsAppTemplate {
  /** Logical id used internally. */
  id: string;
  /** Name registered with Meta — must match exactly. */
  name: string;
  /** ISO language code in Meta. Default for Israel is "he". */
  languageCode: string;
  /** Ordered variable names — positions matter. */
  variables: string[];
  /** Human-readable body for documentation (also matches what Meta has). */
  bodyForReference: string;
  /** "marketing" | "utility" | "authentication" — affects pricing. */
  category: 'marketing' | 'utility' | 'authentication';
}

export const WHATSAPP_TEMPLATES: Record<string, WhatsAppTemplate> = {
  order_confirmation: {
    id: 'order_confirmation',
    name: 'order_confirmation',
    languageCode: 'he',
    variables: ['firstName', 'orderNumber', 'totalFormatted', 'trackingUrl'],
    bodyForReference:
      'שלום {{1}}, ההזמנה #{{2}} התקבלה. סה"כ: {{3}}. מעקב: {{4}}',
    category: 'utility',
  },
  payment_reminder: {
    id: 'payment_reminder',
    name: 'payment_reminder',
    languageCode: 'he',
    variables: ['firstName', 'amountFormatted', 'dueDate', 'payUrl'],
    bodyForReference:
      'שלום {{1}}, תזכורת על תשלום {{2}} לתאריך {{3}}. תשלום: {{4}}',
    category: 'utility',
  },
  event_day_reminder: {
    id: 'event_day_reminder',
    name: 'event_day_reminder',
    languageCode: 'he',
    variables: ['firstName', 'eventName', 'time', 'location'],
    bodyForReference:
      'שלום {{1}}, היום {{2}} בשעה {{3}} ב-{{4}}. נתראה!',
    category: 'utility',
  },
  otp_login: {
    id: 'otp_login',
    name: 'otp_login',
    languageCode: 'he',
    variables: ['code'],
    bodyForReference: 'קוד הכניסה שלך: {{1}}. תקף 5 דק׳.',
    category: 'authentication',
  },
};
