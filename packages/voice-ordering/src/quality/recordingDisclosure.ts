// גילוי נאות על הקלטה — מותאם לחוק הגנת הפרטיות בישראל
export const HEBREW_DISCLOSURE =
  'לידיעתך, השיחה מוקלטת לצורכי שיפור השירות ובקרת איכות. המשך השיחה מהווה הסכמה.';

export const HEBREW_DISCLOSURE_SHORT = 'השיחה מוקלטת.';

export interface DisclosureConfig {
  required: boolean;
  text?: string;
  language?: 'he-IL' | 'en-US';
}

export function disclosureText(cfg: DisclosureConfig = { required: true }): string | null {
  if (!cfg.required) return null;
  return cfg.text ?? (cfg.language === 'en-US' ? 'This call is being recorded for quality assurance.' : HEBREW_DISCLOSURE);
}
