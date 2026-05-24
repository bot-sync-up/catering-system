'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragOverEvent, type DragStartEvent, useDroppable,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Link from 'next/link';
import { trpc } from '~/lib/trpc-client';
import { formatCurrency } from '~/lib/utils';
import { Plus, Target } from 'lucide-react';
import { LeadCreateDialog } from '~/components/LeadCreateDialog';

type Lead = {
  id: string;
  title: string;
  value: number;
  currency: string;
  stageId: string;
  source: string;
  customer: { id: string; displayName: string } | null;
  owner: { id: string; name: string; avatarUrl: string | null } | null;
};

export default function PipelinePage() {
  const { data, refetch } = trpc.lead.board.useQuery();
  const moveMut = trpc.lead.move.useMutation({ onSuccess: () => refetch() });

  // Local optimistic copy of stages -> leads
  const [columns, setColumns] = useState<Record<string, Lead[]>>({});
  useEffect(() => {
    if (!data?.stages) return;
    const map: Record<string, Lead[]> = {};
    for (const s of data.stages) map[s.id] = (s.leads as any) ?? [];
    setColumns(map);
  }, [data?.stages]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [openNew, setOpenNew] = useState<string | null>(null); // stageId

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const findContainer = (id: string) => {
    if (columns[id]) return id;
    return Object.keys(columns).find((k) => columns[k].some((l) => l.id === id));
  };

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    const fromCol = findContainer(String(active.id));
    const toCol = findContainer(String(over.id));
    if (!fromCol || !toCol || fromCol === toCol) return;

    setColumns((prev) => {
      const fromItems = [...prev[fromCol]];
      const toItems = [...prev[toCol]];
      const idx = fromItems.findIndex((l) => l.id === active.id);
      if (idx === -1) return prev;
      const [item] = fromItems.splice(idx, 1);
      const overIdx = toItems.findIndex((l) => l.id === over.id);
      const insertAt = overIdx >= 0 ? overIdx : toItems.length;
      toItems.splice(insertAt, 0, { ...item, stageId: toCol });
      return { ...prev, [fromCol]: fromItems, [toCol]: toItems };
    });
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;
    const fromCol = findContainer(String(active.id));
    const toCol = findContainer(String(over.id));
    if (!fromCol || !toCol) return;

    let toIndex: number;
    if (fromCol === toCol) {
      const items = columns[toCol];
      const oldIdx = items.findIndex((l) => l.id === active.id);
      const newIdx = items.findIndex((l) => l.id === over.id);
      if (oldIdx === -1 || newIdx === -1) return;
      const reordered = arrayMove(items, oldIdx, newIdx);
      setColumns((prev) => ({ ...prev, [toCol]: reordered }));
      toIndex = newIdx;
    } else {
      toIndex = columns[toCol].findIndex((l) => l.id === active.id);
      if (toIndex < 0) toIndex = columns[toCol].length;
    }

    moveMut.mutate({ leadId: String(active.id), toStageId: toCol, toIndex });
  };

  const activeLead = useMemo(() => {
    if (!activeId) return null;
    for (const col of Object.values(columns)) {
      const found = col.find((l) => l.id === activeId);
      if (found) return found;
    }
    return null;
  }, [activeId, columns]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6" /> Sales Pipeline
          </h1>
          {data?.pipeline?.name && <div className="text-sm text-slate-500">{data.pipeline.name}</div>}
        </div>
      </div>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {data?.stages.map((s: any) => (
            <Column
              key={s.id}
              stageId={s.id}
              name={s.name}
              probability={s.probability}
              leads={columns[s.id] ?? []}
              onAddLead={() => setOpenNew(s.id)}
            />
          ))}
        </div>
        <DragOverlay>
          {activeLead ? <LeadCardView lead={activeLead} dragging /> : null}
        </DragOverlay>
      </DndContext>

      {openNew && data?.pipeline && (
        <LeadCreateDialog
          pipelineId={data.pipeline.id}
          stageId={openNew}
          onClose={() => setOpenNew(null)}
          onCreated={() => {
            setOpenNew(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function Column({
  stageId, name, probability, leads, onAddLead,
}: {
  stageId: string;
  name: string;
  probability: number;
  leads: Lead[];
  onAddLead: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stageId });
  const total = leads.reduce((s, l) => s + l.value, 0);
  return (
    <div ref={setNodeRef} className={`min-w-[280px] w-[280px] flex-shrink-0 ${isOver ? 'ring-2 ring-brand-300 rounded-xl' : ''}`}>
      <div className="card p-3 mb-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold">{name}</div>
            <div className="text-xs text-slate-500">{leads.length} לידים · {formatCurrency(total)} · {Math.round(probability * 100)}%</div>
          </div>
          <button onClick={onAddLead} className="btn-ghost p-1.5"><Plus className="w-4 h-4" /></button>
        </div>
      </div>
      <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 min-h-[100px]">
          {leads.map((l) => <SortableLead key={l.id} lead={l} />)}
          {!leads.length && (
            <div className="text-xs text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-lg py-6">
              גרור לכאן
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableLead({ lead }: { lead: Lead }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <LeadCardView lead={lead} />
    </div>
  );
}

function LeadCardView({ lead, dragging }: { lead: Lead; dragging?: boolean }) {
  return (
    <div className={`card p-3 cursor-grab active:cursor-grabbing ${dragging ? 'shadow-lg' : ''}`}>
      <Link href={`/leads/${lead.id}`} className="font-medium text-sm hover:text-brand-700" onClick={(e) => e.stopPropagation()}>
        {lead.title}
      </Link>
      {lead.customer && <div className="text-xs text-slate-500">{lead.customer.displayName}</div>}
      <div className="flex justify-between items-center mt-2">
        <span className="text-xs font-medium">{formatCurrency(lead.value, lead.currency)}</span>
        <span className="badge bg-slate-100 text-slate-600 text-[10px]">{lead.source}</span>
      </div>
      {lead.owner && <div className="text-xs text-slate-400 mt-1">בעלים: {lead.owner.name}</div>}
    </div>
  );
}
