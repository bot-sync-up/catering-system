import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'מדיניות פרטיות',
  description: 'איך אנחנו מטפלים במידע שלכם.',
  path: '/privacy',
});

export default function PrivacyPage() {
  return (
    <section className="section">
      <div className="container-x prose-rtl max-w-3xl">
        <h1 className="section-title">מדיניות פרטיות</h1>
        <p className="mt-4 text-ink-muted">
          אנו מכבדים את פרטיותכם. מידע שנאסף דרך טופס יצירת קשר משמש אך ורק לחזרה אליכם. אנו לא מעבירים מידע לצדדים שלישיים מלבד ספקי שירות חיוניים (CRM, אחסון ענן).
        </p>
        <h2 className="mt-8 text-2xl font-bold">איזה מידע נאסף?</h2>
        <ul className="mt-3 list-disc space-y-2 pr-6">
          <li>שם, אימייל, טלפון בעת מילוי טופס יצירת קשר.</li>
          <li>שם וטקסט המלצה — לאחר אישור מודרציה.</li>
          <li>פרטי חוזה וחתימה דיגיטלית — נשמרים מוצפנים.</li>
        </ul>
        <h2 className="mt-8 text-2xl font-bold">הזכויות שלכם</h2>
        <p className="mt-3 text-ink-muted">
          בכל עת ניתן לבקש לעיין במידע, לתקנו או למוחקו במייל לכתובת המופיעה בעמוד צור קשר.
        </p>
      </div>
    </section>
  );
}
