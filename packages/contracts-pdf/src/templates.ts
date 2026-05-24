import type { ContractTemplate } from './types.js';

export const TEMPLATES: ContractTemplate[] = [
  {
    id: 'photography-event',
    title: 'הסכם צילום אירוע',
    description: 'תבנית סטנדרטית לצילום חתונה / בר מצווה / אירוע פרטי.',
    defaultRenewalDays: 0,
    fields: [
      { key: 'eventType', label: 'סוג האירוע', type: 'text', required: true, placeholder: 'חתונה / בר מצווה / יום הולדת' },
      { key: 'eventDate', label: 'תאריך האירוע', type: 'date', required: true },
      { key: 'venue', label: 'מקום האירוע', type: 'text', required: true },
      { key: 'startTime', label: 'שעת התחלה', type: 'text', required: true, placeholder: '18:00' },
      { key: 'hours', label: 'שעות צילום', type: 'number', required: true, default: 6 },
      { key: 'photographers', label: 'מספר צלמים', type: 'number', default: 1 },
      { key: 'deliverables', label: 'תוצרים', type: 'text', default: 'גלריה אונליין + 300 תמונות מעובדות' },
      { key: 'deliveryDays', label: 'ימי הספקה', type: 'number', default: 30 },
      { key: 'deposit', label: 'מקדמה (₪)', type: 'currency', required: true, default: 1000 },
    ],
    body: `הסכם זה נערך ונחתם בין {{provider.name}} ("הצלם") לבין {{client.name}} ("הלקוח").

1. **השירות**: צילום {{fields.eventType}} בתאריך {{fields.eventDate}} במקום {{fields.venue}}, החל מהשעה {{fields.startTime}}, למשך {{fields.hours}} שעות.
2. **צוות**: {{fields.photographers}} צלמים.
3. **תוצרים**: {{fields.deliverables}}. הספקה תוך {{fields.deliveryDays}} יום.
4. **תמורה**: סך {{totalAmount}} {{currency}} כולל מע"מ. מקדמה של {{fields.deposit}} ₪ במעמד החתימה; היתרה ביום האירוע.
5. **ביטולים**: ביטול עד 30 יום לפני האירוע — החזר מלא בניכוי 10%. בתוך 30 יום — המקדמה אינה מוחזרת.
6. **זכויות יוצרים**: הצלם שומר על זכויות היוצרים. ללקוח רישיון אישי לשימוש פרטי.
7. **כוח עליון**: במקרה של מניעה אובייקטיבית — שני הצדדים יפעלו לקבוע מועד חלופי בתום לב.

ולראיה באו הצדדים על החתום.`,
  },
  {
    id: 'photography-commercial',
    title: 'הסכם צילום מסחרי / מיתוג',
    description: 'תבנית למיתוג עסקי, קטלוג ומוצרים. כולל זכויות שימוש מסחרי.',
    defaultRenewalDays: 365,
    fields: [
      { key: 'projectScope', label: 'תיאור הפרויקט', type: 'text', required: true },
      { key: 'shootDays', label: 'ימי צילום', type: 'number', default: 1 },
      { key: 'usageScope', label: 'היקף שימוש', type: 'text', default: 'דיגיטל + דפוס לשנה אחת' },
      { key: 'exclusivity', label: 'בלעדיות', type: 'boolean', default: false },
      { key: 'deliveryDays', label: 'ימי הספקה', type: 'number', default: 14 },
    ],
    body: `הסכם זה בין {{provider.name}} ("הספק") לבין {{client.name}} ("הלקוח") עבור הפרויקט: {{fields.projectScope}}.

1. **היקף**: {{fields.shootDays}} ימי צילום.
2. **שימוש**: {{fields.usageScope}}. בלעדיות: {{fields.exclusivity}}.
3. **הספקה**: {{fields.deliveryDays}} ימי עסקים מסיום הצילום.
4. **תמורה**: {{totalAmount}} {{currency}} בתוספת מע"מ כדין.
5. **תנאי תשלום**: 50% במעמד החתימה, 50% במסירה.
6. **זכויות יוצרים**: הספק שומר על הזכויות; הלקוח מקבל רישיון לפי סעיף 2.
7. **חידוש**: רישיון השימוש מתחדש בכפוף לתשלום חידוש בתום תקופת הרישיון.`,
  },
  {
    id: 'retainer-monthly',
    title: 'ריטיינר חודשי',
    description: 'הסכם ריטיינר חודשי לשירותים שוטפים.',
    defaultRenewalDays: 30,
    fields: [
      { key: 'monthlyHours', label: 'שעות חודשיות', type: 'number', required: true, default: 10 },
      { key: 'monthlyFee', label: 'תמורה חודשית (₪)', type: 'currency', required: true, default: 3000 },
      { key: 'noticeDays', label: 'הודעה מוקדמת לסיום', type: 'number', default: 30 },
    ],
    body: `הסכם ריטיינר בין {{provider.name}} לבין {{client.name}}.

1. **שירות שוטף**: עד {{fields.monthlyHours}} שעות בחודש.
2. **תמורה**: {{fields.monthlyFee}} ₪ לחודש, בתוספת מע"מ.
3. **תוקף**: מ-{{effectiveFrom}} עד {{effectiveTo}}. מתחדש אוטומטית בכפוף לאי-הודעה.
4. **סיום**: כל צד רשאי לסיים בהודעה של {{fields.noticeDays}} ימים מראש.`,
  },
];

export function getTemplate(id: string): ContractTemplate | null {
  return TEMPLATES.find((t) => t.id === id) ?? null;
}

/** Render a template body with mustache-style {{var}} substitution. */
export function renderTemplate(body: string, ctx: Record<string, unknown>): string {
  return body.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, path: string) => {
    const v = path
      .split('.')
      .reduce<any>((acc, key) => (acc == null ? acc : acc[key]), ctx);
    if (v === undefined || v === null) return '';
    if (typeof v === 'boolean') return v ? 'כן' : 'לא';
    return String(v);
  });
}
