/**
 * שמות ערים בישראל בכל השפות שלנו.
 * כולל תעתיק רוסי/אמהרית לערים מרכזיות עבור משלוחים ושימושי CRM.
 */

export type CityKey =
  | 'jerusalem' | 'tel-aviv' | 'haifa' | 'rishon' | 'petah-tikva' | 'ashdod' | 'netanya'
  | 'beer-sheva' | 'bnei-brak' | 'holon' | 'ramat-gan' | 'ashkelon' | 'rehovot'
  | 'bat-yam' | 'beit-shemesh' | 'kfar-saba' | 'herzliya' | 'hadera' | 'modiin' | 'ramla'
  | 'nazareth' | 'umm-al-fahm' | 'tiberias' | 'eilat' | 'lod' | 'nahariya' | 'safed'
  | 'modiin-illit' | 'elad' | 'beitar-illit';

export interface CityNames {
  he: string;
  en: string;
  ar: string;
  ru: string;
  am: string;
}

export const CITIES: Record<CityKey, CityNames> = {
  'jerusalem':     { he: 'ירושלים',    en: 'Jerusalem',     ar: 'القدس',          ru: 'Иерусалим',       am: 'ኢየሩሳሌም' },
  'tel-aviv':      { he: 'תל אביב',    en: 'Tel Aviv',      ar: 'تل أبيب',        ru: 'Тель-Авив',       am: 'ቴል አቪቭ' },
  'haifa':         { he: 'חיפה',       en: 'Haifa',         ar: 'حيفا',           ru: 'Хайфа',           am: 'ሐይፋ' },
  'rishon':        { he: 'ראשון לציון', en: 'Rishon LeZion', ar: 'ريشون لتسيون',  ru: 'Ришон-ле-Цион',   am: 'ሪሾን ለጺዮን' },
  'petah-tikva':   { he: 'פתח תקווה',  en: 'Petah Tikva',   ar: 'بيتح تكفا',      ru: 'Петах-Тиква',     am: 'ፔታህ ቲክቫ' },
  'ashdod':        { he: 'אשדוד',      en: 'Ashdod',        ar: 'أشدود',          ru: 'Ашдод',           am: 'አሽዶድ' },
  'netanya':       { he: 'נתניה',      en: 'Netanya',       ar: 'نتانيا',         ru: 'Нетания',         am: 'ኔታኒያ' },
  'beer-sheva':    { he: 'באר שבע',    en: 'Beersheba',     ar: 'بئر السبع',      ru: 'Беэр-Шева',       am: 'ቤር ሼቫ' },
  'bnei-brak':     { he: 'בני ברק',    en: 'Bnei Brak',     ar: 'بني براك',       ru: 'Бней-Брак',       am: 'ብኔይ ብራክ' },
  'holon':         { he: 'חולון',      en: 'Holon',         ar: 'حولون',          ru: 'Холон',           am: 'ሆሎን' },
  'ramat-gan':     { he: 'רמת גן',     en: 'Ramat Gan',     ar: 'رمات غان',       ru: 'Рамат-Ган',       am: 'ራማት ጋን' },
  'ashkelon':      { he: 'אשקלון',     en: 'Ashkelon',      ar: 'عسقلان',         ru: 'Ашкелон',         am: 'አሽከሎን' },
  'rehovot':       { he: 'רחובות',     en: 'Rehovot',       ar: 'رحوبوت',         ru: 'Реховот',         am: 'ሬሆቮት' },
  'bat-yam':       { he: 'בת ים',      en: 'Bat Yam',       ar: 'بات يام',        ru: 'Бат-Ям',          am: 'ባት ያም' },
  'beit-shemesh':  { he: 'בית שמש',    en: 'Beit Shemesh',  ar: 'بيت شيمش',       ru: 'Бейт-Шемеш',      am: 'ቤት ሼሜሽ' },
  'kfar-saba':     { he: 'כפר סבא',    en: 'Kfar Saba',     ar: 'كفار سابا',      ru: 'Кфар-Сава',       am: 'ክፋር ሳባ' },
  'herzliya':      { he: 'הרצליה',     en: 'Herzliya',      ar: 'هرتسليا',        ru: 'Герцлия',         am: 'ሄርጽሊያ' },
  'hadera':        { he: 'חדרה',       en: 'Hadera',        ar: 'الخضيرة',        ru: 'Хадера',          am: 'ሐደራ' },
  'modiin':        { he: 'מודיעין',    en: 'Modiin',        ar: 'موديعين',        ru: 'Модиин',          am: 'ሞዲዒን' },
  'ramla':         { he: 'רמלה',       en: 'Ramla',         ar: 'الرملة',         ru: 'Рамла',           am: 'ራምላ' },
  'nazareth':      { he: 'נצרת',       en: 'Nazareth',      ar: 'الناصرة',        ru: 'Назарет',         am: 'ናዝሬት' },
  'umm-al-fahm':   { he: 'אום אל פחם', en: 'Umm al-Fahm',   ar: 'أم الفحم',       ru: 'Умм-эль-Фахм',    am: 'ኡም አል ፋህም' },
  'tiberias':      { he: 'טבריה',      en: 'Tiberias',      ar: 'طبريا',          ru: 'Тверия',          am: 'ጥብርያ' },
  'eilat':         { he: 'אילת',       en: 'Eilat',         ar: 'إيلات',          ru: 'Эйлат',           am: 'ኤላት' },
  'lod':           { he: 'לוד',        en: 'Lod',           ar: 'اللد',           ru: 'Лод',             am: 'ሎድ' },
  'nahariya':      { he: 'נהריה',      en: 'Nahariya',      ar: 'نهاريا',         ru: 'Нагария',         am: 'ናሃሪያ' },
  'safed':         { he: 'צפת',        en: 'Safed',         ar: 'صفد',            ru: 'Цфат',            am: 'ጸፋት' },
  'modiin-illit':  { he: 'מודיעין עילית', en: 'Modiin Illit', ar: 'موديعين عيليت', ru: 'Модиин-Илит',   am: 'ሞዲዒን ኢሊት' },
  'elad':          { he: 'אלעד',       en: 'Elad',          ar: 'إلعاد',          ru: 'Эльад',           am: 'ኤልአድ' },
  'beitar-illit':  { he: 'ביתר עילית', en: 'Beitar Illit',  ar: 'بيتار عيليت',    ru: 'Бейтар-Илит',     am: 'ቤታር ኢሊት' },
};

export function getCityName(key: CityKey, locale: keyof CityNames): string {
  return CITIES[key]?.[locale] ?? CITIES[key]?.en ?? key;
}

/** חיפוש עיר לפי שם בכל שפה — נורמליזציה בסיסית. שימושי לקלט משתמש. */
export function findCityByName(input: string): CityKey | null {
  const norm = input.trim().toLowerCase();
  for (const [key, names] of Object.entries(CITIES) as [CityKey, CityNames][]) {
    for (const val of Object.values(names)) {
      if (val.toLowerCase() === norm) return key;
    }
  }
  return null;
}
