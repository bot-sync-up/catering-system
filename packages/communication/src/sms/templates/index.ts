/**
 * Hebrew SMS templates.
 *
 * SMS limits (Israel): 70 chars per segment for Unicode (Hebrew),
 * 160 for GSM-7. Each template should fit in 1–2 segments when filled
 * with typical data, or callers pay multi-segment rates.
 *
 * "sender" is the alphanumeric/numeric source name the SMS appears from
 * — must be approved by the operators (see INTEGRATION-KEYS.md).
 */
import Handlebars from 'handlebars';

export interface SmsTemplate {
  id: string;
  sender: string;
  body: string;
  vars: string[];
  /** Estimated segments at typical data — for cost forecasting. */
  estimatedSegments: number;
}

export const SMS_TEMPLATES: Record<string, SmsTemplate> = {
  otp: {
    id: 'otp',
    sender: 'SyncUp',
    body: 'הקוד שלך ל-{{brandName}}: {{code}}. תקף 5 דקות. אין לשתף.',
    vars: ['brandName', 'code'],
    estimatedSegments: 1,
  },
  orderShipped: {
    id: 'orderShipped',
    sender: 'SyncUp',
    body: 'הזמנה #{{orderNumber}} נשלחה! מעקב: {{trackUrl}}',
    vars: ['orderNumber', 'trackUrl'],
    estimatedSegments: 1,
  },
  paymentReminder: {
    id: 'paymentReminder',
    sender: 'SyncUp',
    body: 'תזכורת: יתרת חוב {{amountFormatted}}. תשלום: {{payUrl}}',
    vars: ['amountFormatted', 'payUrl'],
    estimatedSegments: 1,
  },
  eventToday: {
    id: 'eventToday',
    sender: 'SyncUp',
    body: 'תזכורת: היום בשעה {{time}} — {{eventName}}. {{location}}',
    vars: ['time', 'eventName', 'location'],
    estimatedSegments: 1,
  },
  driverEta: {
    id: 'driverEta',
    sender: 'SyncUp',
    body: 'השליח {{driverName}} בדרך, צפוי בעוד {{minutes}} דק׳. {{trackUrl}}',
    vars: ['driverName', 'minutes', 'trackUrl'],
    estimatedSegments: 1,
  },
  appointmentReminder: {
    id: 'appointmentReminder',
    sender: 'SyncUp',
    body: 'תזכורת לתור: {{date}} בשעה {{time}} אצל {{provider}}. ביטול: {{cancelUrl}}',
    vars: ['date', 'time', 'provider', 'cancelUrl'],
    estimatedSegments: 2,
  },
};

const compiled = new Map<string, HandlebarsTemplateDelegate<Record<string, unknown>>>();

export function applySmsTemplate(id: string, data: Record<string, unknown>): string {
  const tpl = SMS_TEMPLATES[id];
  if (!tpl) throw new Error(`Unknown SMS template: ${id}`);
  let fn = compiled.get(id);
  if (!fn) {
    fn = Handlebars.compile(tpl.body, { noEscape: true });
    compiled.set(id, fn);
  }
  return fn(data);
}

/**
 * Normalize an Israeli phone to international format expected by 019:
 *   "0501234567" -> "972501234567"
 *   "+972501234567" -> "972501234567"
 * Non-Israeli numbers are returned as-is (without the leading '+').
 */
export function normalizeIsraeliPhone(input: string): string {
  const digits = input.replace(/[^\d+]/g, '');
  if (digits.startsWith('+972')) return digits.slice(1);
  if (digits.startsWith('972')) return digits;
  if (digits.startsWith('0')) return `972${digits.slice(1)}`;
  if (digits.startsWith('+')) return digits.slice(1);
  return digits;
}
