import { useState } from 'react';
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core';

interface Block {
  id: string;
  type: 'heading' | 'paragraph' | 'button' | 'image' | 'divider';
  content?: string;
  url?: string;
  imageUrl?: string;
}

const PALETTE: { type: Block['type']; label: string }[] = [
  { type: 'heading', label: 'כותרת' },
  { type: 'paragraph', label: 'פסקה' },
  { type: 'button', label: 'כפתור' },
  { type: 'image', label: 'תמונה' },
  { type: 'divider', label: 'מפריד' },
];

export function TemplateBuilder({
  value, onSave, onCancel,
}: { value: any; onSave: (t: any) => void; onCancel: () => void }) {
  const [t, setT] = useState<any>({
    ...value,
    design: value.design && Object.keys(value.design).length ? value.design : { blocks: [] },
  });
  const [selected, setSelected] = useState<string | null>(null);
  const blocks: Block[] = t.design.blocks ?? [];

  function updateBlocks(blocks: Block[]) {
    setT({ ...t, design: { ...t.design, blocks }, body: blocksToHtml(blocks) });
  }

  function handleDragEnd(e: DragEndEvent) {
    const t = String(e.active.id);
    if (e.over?.id === 'canvas') {
      const newBlock: Block = { id: `b_${Date.now()}`, type: t as any, content: defaultContent(t as any) };
      updateBlocks([...blocks, newBlock]);
    }
  }

  return (
    <div className="card">
      <div className="flex" style={{ marginBottom: 16 }}>
        <input placeholder="שם התבנית" value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} />
        <select value={t.channel} onChange={(e) => setT({ ...t, channel: e.target.value })}>
          <option value="EMAIL">אימייל</option>
          <option value="SMS">SMS</option>
          <option value="WHATSAPP">WhatsApp</option>
        </select>
        {t.channel === 'EMAIL' && (
          <input placeholder="שורת נושא" value={t.subject ?? ''} onChange={(e) => setT({ ...t, subject: e.target.value })} />
        )}
      </div>

      {t.channel === 'EMAIL' ? (
        <DndContext onDragEnd={handleDragEnd}>
          <div className="builder">
            <div className="block-palette">
              <h4>בלוקים</h4>
              {PALETTE.map((p) => <PaletteItem key={p.type} type={p.type} label={p.label} />)}
            </div>
            <Canvas blocks={blocks} selected={selected} onSelect={setSelected} onChange={updateBlocks} />
            <BlockEditor blocks={blocks} selected={selected} onChange={updateBlocks} />
          </div>
        </DndContext>
      ) : (
        <textarea rows={8} placeholder="גוף ההודעה. אפשר משתנים: {{firstName}}" value={t.body} onChange={(e) => setT({ ...t, body: e.target.value })} />
      )}

      <div className="flex" style={{ marginTop: 16 }}>
        <button onClick={onCancel}>ביטול</button>
        <div className="spacer" />
        <button className="primary" onClick={() => onSave(t)}>שמירה</button>
      </div>
    </div>
  );
}

function PaletteItem({ type, label }: { type: Block['type']; label: string }) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: type });
  return <div ref={setNodeRef} {...listeners} {...attributes} className="block">{label}</div>;
}

function Canvas({ blocks, selected, onSelect, onChange }: any) {
  const { setNodeRef, isOver } = useDroppable({ id: 'canvas' });
  return (
    <div ref={setNodeRef} className="builder-canvas" style={{ background: isOver ? '#eff6ff' : undefined }}>
      {blocks.length === 0 && <div className="muted" style={{ textAlign: 'center', padding: 60 }}>גרור בלוקים לכאן</div>}
      {blocks.map((b: Block, i: number) => (
        <div key={b.id}
             className={`builder-block ${selected === b.id ? 'selected' : ''}`}
             onClick={() => onSelect(b.id)}>
          <Preview block={b} />
          <div className="flex" style={{ marginTop: 8 }}>
            {i > 0 && <button onClick={(e) => { e.stopPropagation(); const a = [...blocks]; [a[i], a[i-1]] = [a[i-1], a[i]]; onChange(a); }}>↑</button>}
            {i < blocks.length - 1 && <button onClick={(e) => { e.stopPropagation(); const a = [...blocks]; [a[i], a[i+1]] = [a[i+1], a[i]]; onChange(a); }}>↓</button>}
            <button className="danger" onClick={(e) => { e.stopPropagation(); onChange(blocks.filter((x: Block) => x.id !== b.id)); }}>מחק</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function BlockEditor({ blocks, selected, onChange }: any) {
  const block = blocks.find((b: Block) => b.id === selected);
  if (!block) return <div className="muted">בחר בלוק לעריכה</div>;
  function update(patch: Partial<Block>) {
    onChange(blocks.map((b: Block) => (b.id === block.id ? { ...b, ...patch } : b)));
  }
  return (
    <div className="flex-col">
      <h4>עריכה</h4>
      {block.type !== 'divider' && (
        <textarea rows={3} value={block.content ?? ''} onChange={(e) => update({ content: e.target.value })} />
      )}
      {block.type === 'button' && (
        <input placeholder="קישור" value={block.url ?? ''} onChange={(e) => update({ url: e.target.value })} />
      )}
      {block.type === 'image' && (
        <input placeholder="כתובת תמונה" value={block.imageUrl ?? ''} onChange={(e) => update({ imageUrl: e.target.value })} />
      )}
    </div>
  );
}

function Preview({ block }: { block: Block }) {
  if (block.type === 'heading') return <h2 style={{ margin: 0 }}>{block.content}</h2>;
  if (block.type === 'paragraph') return <p style={{ margin: 0 }}>{block.content}</p>;
  if (block.type === 'button') return <button className="primary">{block.content}</button>;
  if (block.type === 'image') return block.imageUrl ? <img src={block.imageUrl} style={{ maxWidth: '100%' }} /> : <div className="muted">[תמונה]</div>;
  return <hr />;
}

function defaultContent(t: Block['type']) {
  if (t === 'heading') return 'כותרת';
  if (t === 'paragraph') return 'טקסט פסקה לדוגמה. תוכל לערוך {{firstName}}.';
  if (t === 'button') return 'לחצ/י כאן';
  return '';
}

function blocksToHtml(blocks: Block[]): string {
  return blocks.map((b) => {
    if (b.type === 'heading') return `<h2 style="color:#1e40af;margin:0 0 12px;">${b.content ?? ''}</h2>`;
    if (b.type === 'paragraph') return `<p style="margin:0 0 12px;">${b.content ?? ''}</p>`;
    if (b.type === 'button') return `<p style="margin:16px 0;"><a href="${b.url ?? '#'}" style="background:#1e40af;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;display:inline-block;">${b.content ?? ''}</a></p>`;
    if (b.type === 'image') return b.imageUrl ? `<p style="margin:12px 0;"><img src="${b.imageUrl}" style="max-width:100%;height:auto;" /></p>` : '';
    return '<hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;" />';
  }).join('\n');
}
