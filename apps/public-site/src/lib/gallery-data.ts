export type GalleryItem = {
  id: string;
  src: string;
  alt: string;
  title: string;
  description?: string;
  tags: string[];
  width: number;
  height: number;
  takenAt: string;
  location?: string;
  photographer?: string;
};

export const ALL_TAGS = [
  'חתונה',
  'בר מצווה',
  'פורטרט',
  'משפחה',
  'מסחרי',
  'אופנה',
  'נוף',
  'אירוע עסקי',
] as const;

export const galleryItems: GalleryItem[] = [
  {
    id: 'g1',
    src: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200',
    alt: 'זוג מתחתן בטבע',
    title: 'יום החתונה של אורי ויעל',
    description: 'צילום חתונה אינטימי בכרם.',
    tags: ['חתונה'],
    width: 1200,
    height: 800,
    takenAt: '2025-06-12',
    location: 'בנימינה',
    photographer: 'אמנון לוי',
  },
  {
    id: 'g2',
    src: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1200',
    alt: 'בר מצווה בכותל',
    title: 'בר המצווה של דניאל',
    tags: ['בר מצווה'],
    width: 1200,
    height: 1500,
    takenAt: '2025-03-04',
    location: 'ירושלים',
  },
  {
    id: 'g3',
    src: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=1200',
    alt: 'פורטרט אישה',
    title: 'פורטרט סטודיו',
    tags: ['פורטרט', 'אופנה'],
    width: 1200,
    height: 1600,
    takenAt: '2025-02-22',
  },
  {
    id: 'g4',
    src: 'https://images.unsplash.com/photo-1554080353-a576cf803bda?w=1200',
    alt: 'משפחה בטיול',
    title: 'משפחת כהן',
    tags: ['משפחה'],
    width: 1200,
    height: 900,
    takenAt: '2025-04-18',
    location: 'פארק הירקון',
  },
  {
    id: 'g5',
    src: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=1200',
    alt: 'צילום מוצר',
    title: 'מותג קוסמטיקה — קמפיין קיץ',
    tags: ['מסחרי'],
    width: 1200,
    height: 1200,
    takenAt: '2025-05-01',
  },
  {
    id: 'g6',
    src: 'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=1200',
    alt: 'נוף הרים',
    title: 'גליל עליון',
    tags: ['נוף'],
    width: 1200,
    height: 800,
    takenAt: '2024-11-09',
    location: 'הר מירון',
  },
  {
    id: 'g7',
    src: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200',
    alt: 'כנס עסקי',
    title: 'כנס שנתי 2025',
    tags: ['אירוע עסקי'],
    width: 1200,
    height: 750,
    takenAt: '2025-01-29',
    location: 'מלון דן',
  },
  {
    id: 'g8',
    src: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=1200',
    alt: 'פורטרט גבר',
    title: 'דיוקן',
    tags: ['פורטרט'],
    width: 1200,
    height: 1500,
    takenAt: '2025-07-14',
  },
];

export function filterByTag(tag?: string) {
  if (!tag) return galleryItems;
  return galleryItems.filter((g) => g.tags.includes(tag));
}
