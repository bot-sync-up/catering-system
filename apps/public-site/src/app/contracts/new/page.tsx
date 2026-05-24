import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';
import { getTemplate, TEMPLATES } from '@contracts/core';
import { ContractWizard } from '@/components/contracts/ContractWizard';

export const metadata = buildMetadata({
  title: 'יצירת חוזה חדש',
  description: 'בחרו תבנית, מלאו פרטים וחתמו דיגיטלית.',
  path: '/contracts/new',
});

export default function NewContractPage({ searchParams }: { searchParams: { template?: string } }) {
  const templateId = searchParams.template;
  if (!templateId) redirect('/contracts');
  const template = getTemplate(templateId);
  if (!template) notFound();

  return (
    <section className="section">
      <div className="container-x">
        <nav aria-label="פירורי לחם" className="text-sm text-ink-muted">
          <Link href="/contracts" className="hover:text-ink">חוזים</Link>
          <span className="mx-2">/</span>
          <span className="text-ink">{template.title}</span>
        </nav>
        <header className="mt-4">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">{template.title}</h1>
          <p className="mt-2 text-ink-muted">{template.description}</p>
        </header>
        <div className="mt-10">
          <ContractWizard template={template} />
        </div>
      </div>
    </section>
  );
}

export function generateStaticParams() {
  return TEMPLATES.map((t) => ({ template: t.id }));
}
