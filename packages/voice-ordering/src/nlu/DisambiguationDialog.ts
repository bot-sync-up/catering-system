// שאלות הבהרה כאשר יש עמימות (לדוגמה "בשבת" — האם השבת הקרובה או הבאה?)
import type { ExtractedEntities } from '../types.js';

export interface ClarificationQuestion {
  field: keyof ExtractedEntities;
  question: string;
  options?: string[];
}

export function needsClarification(
  entities: ExtractedEntities,
  userText: string
): ClarificationQuestion | null {
  // "בשבת" ללא ציון איזו שבת (אין \b בעברית — בודקים גבולות מילה ידנית)
  if (
    entities.date == null &&
    /(^|\s)בשבת(\s|$)/.test(userText) &&
    !/הבאה|קרובה|הזאת|הזו/.test(userText)
  ) {
    return {
      field: 'date',
      question: 'האם הכוונה לשבת הקרובה או לשבת הבאה?',
      options: ['השבת הקרובה', 'השבת הבאה'],
    };
  }

  // מספר אורחים לא מציאותי או חסר
  if (entities.guestCount != null && (entities.guestCount < 5 || entities.guestCount > 2000)) {
    return {
      field: 'guestCount',
      question: `אמרת ${entities.guestCount} אורחים — אפשר לוודא שזה המספר הנכון?`,
    };
  }

  // תאריך לא מובן
  if (entities.date && !/^\d{4}-\d{2}-\d{2}$/.test(entities.date)) {
    return {
      field: 'date',
      question: 'לא הצלחתי לוודא את התאריך. אפשר להגיד שוב, למשל בפורמט "15 בנובמבר 2026"?',
    };
  }

  // סוג אירוע חסר
  if (!entities.eventType) {
    return {
      field: 'eventType',
      question: 'לאיזה סוג אירוע מדובר? חתונה, בר מצווה, ברית, או משהו אחר?',
      options: ['חתונה', 'בר מצווה', 'בת מצווה', 'ברית', 'אחר'],
    };
  }

  return null;
}
