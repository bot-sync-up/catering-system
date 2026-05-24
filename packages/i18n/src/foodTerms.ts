/**
 * מונחי מזון ערביים — حلال, مكان (מאכלים מסורתיים), ועוד.
 * משלים את הטקסונומיה היהודית, לקהל הערבי בישראל.
 */

export type ArabicFoodCategory = 'halal' | 'mekane' | 'mezze' | 'mansaf' | 'maqluba' | 'shawarma' | 'falafel';

export interface ArabicFoodTerm {
  id: ArabicFoodCategory;
  ar: string;
  he: string;
  en: string;
  ru: string;
  /** האם זה תיוג כשרות (halal) או שם מנה */
  isCertification: boolean;
}

export const ARABIC_FOOD_TERMS: Record<ArabicFoodCategory, ArabicFoodTerm> = {
  halal:     { id: 'halal',     ar: 'حلال',    he: 'חלאל',   en: 'Halal',     ru: 'Халяль',     isCertification: true },
  mekane:    { id: 'mekane',    ar: 'مكان',    he: 'מקאנה',   en: 'Mekane',    ru: 'Макане',     isCertification: false },
  mezze:     { id: 'mezze',     ar: 'مزة',     he: 'מזה',    en: 'Mezze',     ru: 'Мезе',       isCertification: false },
  mansaf:    { id: 'mansaf',    ar: 'منسف',    he: 'מנסף',   en: 'Mansaf',    ru: 'Мансаф',     isCertification: false },
  maqluba:   { id: 'maqluba',   ar: 'مقلوبة',  he: 'מקלובה', en: 'Maqluba',   ru: 'Маклюба',    isCertification: false },
  shawarma:  { id: 'shawarma',  ar: 'شاورما',  he: 'שווארמה', en: 'Shawarma', ru: 'Шаурма',    isCertification: false },
  falafel:   { id: 'falafel',   ar: 'فلافل',   he: 'פלאפל',  en: 'Falafel',   ru: 'Фалафель',   isCertification: false },
};

export function arabicFoodLabel(id: ArabicFoodCategory, locale: 'he' | 'en' | 'ar' | 'ru'): string {
  return ARABIC_FOOD_TERMS[id][locale];
}

export function isHalalCertified(tags: readonly string[]): boolean {
  return tags.some((t) => t === 'halal' || t === 'حلال' || t.toLowerCase() === 'halal');
}
