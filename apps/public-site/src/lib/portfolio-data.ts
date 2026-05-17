export type PortfolioProject = {
  slug: string;
  title: string;
  client: string;
  category: 'חתונה' | 'מסחרי' | 'אירוע עסקי' | 'פורטרט' | 'משפחה';
  year: number;
  cover: string;
  excerpt: string;
  description: string;
  highlights: string[];
  images: string[];
};

export const portfolio: PortfolioProject[] = [
  {
    slug: 'wedding-uri-yael',
    title: 'חתונה בכרם — אורי ויעל',
    client: 'משפחות אורי ויעל',
    category: 'חתונה',
    year: 2025,
    cover: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1600',
    excerpt: 'יום חתונה אינטימי, אור זהוב, ולב מלא.',
    description:
      'ליווינו את אורי ויעל מהבוקר ועד שעות הקטנות. תיעוד דוקומנטרי לצד פורטרטים מלוטשים, עם דגש על אווירה ורגעים אמיתיים.',
    highlights: ['10 שעות צילום', '2 צלמים', '600 תמונות מעובדות', 'אלבום פרימיום'],
    images: [
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=1600',
      'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=1600',
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1600',
    ],
  },
  {
    slug: 'brightstartup-corporate',
    title: 'ברייטסטרטאפ — קמפיין תאגידי',
    client: 'BrightStartup',
    category: 'מסחרי',
    year: 2025,
    cover: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1600',
    excerpt: 'דיוקני צוות, מוצרי קמפיין ותמונות סביבה.',
    description:
      'התאמת שפה ויזואלית לאתר ולרשתות. צילומי סטודיו ותיעוד יום עבודה אותנטי. הספקה תוך 5 ימי עסקים.',
    highlights: ['30 דיוקני צוות', '15 תמונות סביבה', 'גרסאות מובייל ודסקטופ', 'זכויות שימוש מסחרי'],
    images: [
      'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1600',
      'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1600',
    ],
  },
  {
    slug: 'family-cohen-park',
    title: 'משפחת כהן — בפארק',
    client: 'משפחת כהן',
    category: 'משפחה',
    year: 2025,
    cover: 'https://images.unsplash.com/photo-1554080353-a576cf803bda?w=1600',
    excerpt: 'אור אחה"צ, ילדים מצחקקים, וקצת קסם.',
    description:
      'שעת קסם בפארק הירקון. הצילום עבד מסביב לילדים — לא להפך — והתוצאה מרגישה כמו זיכרון חי.',
    highlights: ['90 דקות צילום', '60 תמונות מעובדות', 'אלבום משפחתי'],
    images: ['https://images.unsplash.com/photo-1554080353-a576cf803bda?w=1600'],
  },
  {
    slug: 'annual-conference-2025',
    title: 'כנס שנתי 2025',
    client: 'מועדון מנכ"לים',
    category: 'אירוע עסקי',
    year: 2025,
    cover: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1600',
    excerpt: 'תיעוד יום שלם של מרצים, פאנלים ומפגשים.',
    description: 'אספקה מהירה תוך 24 שעות לקריאיטיב של הלקוח. דגש על אנרגיה ואינטראקציות.',
    highlights: ['10 שעות תיעוד', 'הספקה ב-24 שעות', 'גלריית לקוח'],
    images: ['https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1600'],
  },
];

export function getProject(slug: string) {
  return portfolio.find((p) => p.slug === slug) ?? null;
}
