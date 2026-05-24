'use client';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { trpc } from '~/lib/trpc-client';
import { formatCurrency, formatDateTime } from '~/lib/utils';

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: lead, refetch } = trpc.lead.byId.useQuery({ id: params!.id });
  const move = trpc.lead.move.useMutation({ onSuccess: () => refetch() });

  if (!lead) return <div className="text-slate-500">טוען...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">{lead.title}</h1>
        <div className="text-sm text-slate-500">{lead.description}</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="ערך" value={formatCurrency(lead.value, lead.currency)} />
        <Stat label="שלב" value={lead.stage.name} />
        <Stat label="מקור" value={lead.source} />
        <Stat label="סטטוס" value={lead.status} />
      </div>

      <section className="card p-4">
        <h3 className="font-semibold mb-3">העבר לשלב</h3>
        <div className="flex flex-wrap gap-2">
          {lead.pipeline.stages.map((s) => (
            <button
              key={s.id}
              disabled={s.id === lead.stageId}
              className={`btn ${s.id === lead.stageId ? 'bg-brand-600 text-white' : 'btn-ghost'}`}
              onClick={() => move.mutate({ leadId: lead.id, toStageId: s.id, toIndex: 0 })}
            >
              {s.name}
            </button>
          ))}
        </div>
      </section>

      <section className="card p-4">
        <h3 className="font-semibold mb-3">פרטים</h3>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Detail label="לקוח" value={lead.customer ? <Link className="text-brand-700 hover:underline" href={`/customers/${lead.customer.id}`}>{lead.customer.displayName}</Link> : '—'} />
          <Detail label="בעלים" value={lead.owner?.name ?? '—'} />
          <Detail label="ממליץ" value={lead.referredBy?.displayName ?? '—'} />
          <Detail label="צפי סגירה" value={lead.expectedCloseAt ? formatDateTime(lead.expectedCloseAt) : '—'} />
          <Detail label="UTM source" value={lead.utmSource ?? '—'} />
          <Detail label="UTM campaign" value={lead.utmCampaign ?? '—'} />
        </dl>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="card p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-bold">{value}</div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
