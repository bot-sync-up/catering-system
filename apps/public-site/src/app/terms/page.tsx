import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'תנאי שירות',
  description: 'התנאים החלים על השימוש באתר ובשירותים.',
  path: '/terms',
});

export default function TermsPage() {
  return (
    <section className="section">
      <div className="container-x prose-rtl max-w-3xl">
        <h1 className="section-title">תנאי שירות</h1>
        <p className="mt-4 text-ink-muted">
          השימוש באתר ובשירותים כפוף לתנאים אלו. אנא קראו בעיון לפני הגשת טפסים או חתימה על חוזים דיגיטליים.
        </p>
        <h2 className="mt-8 text-2xl font-bold">קניין רוחני</h2>
        <p className="mt-3 text-ink-muted">
          כל התמונות, הטקסטים והעיצוב הם רכוש הסטודיו או של היוצרים שמורשים על-ידם. שימוש מסחרי ללא אישור — אסור.
        </p>
        <h2 className="mt-8 text-2xl font-bold">חוזים דיגיטליים</h2>
        <p className="mt-3 text-ink-muted">
          חתימה דיגיטלית באתר מהווה הסכמה משפטית מחייבת בהתאם לחוק חתימה אלקטרונית, התשס"א-2001.
        </p>
      </div>
    </section>
  );
}
