export type Testimonial = {
  id: string;
  name: string;
  role?: string;
  rating: 1 | 2 | 3 | 4 | 5;
  content: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
  imageUrl?: string;
};

// Seed approved testimonials. Pending ones live in data/testimonials.json (moderation queue).
export const seedTestimonials: Testimonial[] = [
  {
    id: 't1',
    name: 'יעל לוי',
    role: 'כלה, חתונה ביוני 2025',
    rating: 5,
    content: 'אמנון תפס בדיוק את האווירה. התמונות מספרות את הסיפור שלנו — ממליצה בחום!',
    createdAt: '2025-07-01',
    status: 'approved',
  },
  {
    id: 't2',
    name: 'משפחת כהן',
    role: 'צילום משפחתי',
    rating: 5,
    content: 'מקצועיות, סבלנות עם הילדים, ותוצאות שלא נמאס להסתכל עליהן.',
    createdAt: '2025-05-20',
    status: 'approved',
  },
  {
    id: 't3',
    name: 'דניאל ברקוביץ',
    role: 'בר מצווה',
    rating: 4,
    content: 'חוויה נעימה, אלבום מדהים, התמונה הקבוצתית בפרט מטריפה.',
    createdAt: '2025-04-10',
    status: 'approved',
  },
  {
    id: 't4',
    name: 'חברת ברייטסטרטאפ',
    role: 'מנכ"ל',
    rating: 5,
    content: 'הצילומים התאגידיים שלנו קיבלו חיים חדשים. שותף יצירתי אמיתי.',
    createdAt: '2025-03-02',
    status: 'approved',
  },
];

/** Public site shows only 4–5 star approved testimonials. */
export function publicTestimonials(all: Testimonial[]) {
  return all.filter((t) => t.status === 'approved' && t.rating >= 4);
}
