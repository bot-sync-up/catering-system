import { describe, expect, it } from 'vitest';
import { areCompatibleKinds, meetsKashrutLevel, kashrutKindLabel, kashrutLevelLabel } from '../src/taxonomy';
import { isHalalCertified, arabicFoodLabel } from '../src/foodTerms';
import { getCityName, findCityByName } from '../src/cityNames';
import { HOLIDAYS, holidayName } from '../src/holidays';

describe('taxonomy — כשרות', () => {
  it('בשרי + חלבי = לא תואם', () => {
    expect(areCompatibleKinds('meat', 'dairy')).toBe(false);
    expect(areCompatibleKinds('dairy', 'meat')).toBe(false);
  });
  it('פרווה תואם הכול', () => {
    expect(areCompatibleKinds('pareve', 'meat')).toBe(true);
    expect(areCompatibleKinds('pareve', 'dairy')).toBe(true);
  });
  it('זהה = תואם', () => {
    expect(areCompatibleKinds('meat', 'meat')).toBe(true);
  });
  it('בד"ץ עונה על דרישת מהדרין', () => {
    expect(meetsKashrutLevel('badatz', 'mehadrin')).toBe(true);
  });
  it('כשר רגיל לא עונה על דרישת בד"ץ', () => {
    expect(meetsKashrutLevel('regular', 'badatz')).toBe(false);
  });
  it('תוויות בעברית', () => {
    expect(kashrutKindLabel('meat', 'he')).toBe('בשרי');
    expect(kashrutKindLabel('dairy', 'ar')).toBe('حليبي');
    expect(kashrutLevelLabel('badatz', 'he')).toBe('בד"ץ');
  });
});

describe('foodTerms — ערבית', () => {
  it('זיהוי halal', () => {
    expect(isHalalCertified(['halal'])).toBe(true);
    expect(isHalalCertified(['حلال'])).toBe(true);
    expect(isHalalCertified(['kosher'])).toBe(false);
  });
  it('תוויות', () => {
    expect(arabicFoodLabel('shawarma', 'he')).toBe('שווארמה');
    expect(arabicFoodLabel('shawarma', 'ru')).toBe('Шаурма');
  });
});

describe('cityNames', () => {
  it('שמות בכל שפה', () => {
    expect(getCityName('jerusalem', 'he')).toBe('ירושלים');
    expect(getCityName('jerusalem', 'ar')).toBe('القدس');
    expect(getCityName('umm-al-fahm', 'he')).toBe('אום אל פחם');
    expect(getCityName('nazareth', 'ar')).toBe('الناصرة');
  });
  it('חיפוש לפי שם', () => {
    expect(findCityByName('תל אביב')).toBe('tel-aviv');
    expect(findCityByName('Haifa')).toBe('haifa');
    expect(findCityByName('lalaland')).toBeNull();
  });
});

describe('holidays', () => {
  it('כל החגים המבוקשים קיימים', () => {
    const ids = HOLIDAYS.map((h) => h.id);
    for (const req of ['pesach', 'rosh-hashana', 'yom-haatzmaut', 'chanukah', 'purim', 'sukkot', 'shavuot', 'yom-kippur', 'tisha-bav']) {
      expect(ids).toContain(req);
    }
  });
  it('שמות בשפות', () => {
    const pesach = HOLIDAYS.find((h) => h.id === 'pesach')!;
    expect(holidayName(pesach, 'he')).toBe('פסח');
    expect(holidayName(pesach, 'en')).toBe('Passover');
    expect(holidayName(pesach, 'ar')).toBe('عيد الفصح');
    expect(holidayName(pesach, 'ru')).toBe('Песах');
  });
});
