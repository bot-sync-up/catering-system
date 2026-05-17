import React from 'react';
import type { Invoice, InvoiceItem } from '../types';

interface Props {
  value: Invoice;
  onChange: (next: Invoice) => void;
  readOnly?: boolean;
}

/**
 * Editable invoice form. RTL Hebrew. All numeric inputs accept Hebrew
 * locale (commas) and round-trip to JS numbers.
 */
export const InvoiceForm: React.FC<Props> = ({ value, onChange, readOnly }) => {
  const set = <K extends keyof Invoice>(k: K, v: Invoice[K]) =>
    onChange({ ...value, [k]: v });
  const setSupplier = (patch: Partial<Invoice['supplier']>) =>
    onChange({ ...value, supplier: { ...value.supplier, ...patch } });
  const setItem = (i: number, patch: Partial<InvoiceItem>) => {
    const items = value.items.slice();
    items[i] = { ...items[i], ...patch };
    onChange({ ...value, items });
  };
  const removeItem = (i: number) => {
    const items = value.items.slice();
    items.splice(i, 1);
    onChange({ ...value, items });
  };
  const addItem = () =>
    onChange({
      ...value,
      items: [...value.items, { desc: '', qty: 1, price: 0, vat: 0.17 }],
    });

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <fieldset style={fieldset}>
        <legend>ספק</legend>
        <Row label="שם">
          <input
            style={input}
            value={value.supplier.name}
            disabled={readOnly}
            onChange={(e) => setSupplier({ name: e.target.value })}
          />
        </Row>
        <Row label="ח.פ">
          <input
            style={input}
            value={value.supplier.taxId}
            disabled={readOnly}
            onChange={(e) => setSupplier({ taxId: e.target.value })}
          />
        </Row>
      </fieldset>

      <fieldset style={fieldset}>
        <legend>חשבונית</legend>
        <Row label="מספר">
          <input
            style={input}
            value={value.invoiceNum}
            disabled={readOnly}
            onChange={(e) => set('invoiceNum', e.target.value)}
          />
        </Row>
        <Row label="תאריך">
          <input
            type="date"
            style={input}
            value={value.date}
            disabled={readOnly}
            onChange={(e) => set('date', e.target.value)}
          />
        </Row>
        <Row label="תאריך לתשלום">
          <input
            type="date"
            style={input}
            value={value.dueDate ?? ''}
            disabled={readOnly}
            onChange={(e) => set('dueDate', e.target.value || undefined)}
          />
        </Row>
        <Row label="הזמנת רכש">
          <input
            style={input}
            value={value.poRef ?? ''}
            disabled={readOnly}
            onChange={(e) => set('poRef', e.target.value || undefined)}
          />
        </Row>
      </fieldset>

      <fieldset style={fieldset}>
        <legend>פריטים</legend>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>תיאור</th>
              <th style={th}>כמות</th>
              <th style={th}>מחיר</th>
              <th style={th}>מע"מ</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {value.items.map((it, i) => (
              <tr key={i}>
                <td style={td}>
                  <input
                    style={input}
                    value={it.desc}
                    disabled={readOnly}
                    onChange={(e) => setItem(i, { desc: e.target.value })}
                  />
                </td>
                <td style={td}>
                  <input
                    type="number"
                    style={input}
                    value={it.qty}
                    disabled={readOnly}
                    onChange={(e) => setItem(i, { qty: Number(e.target.value) })}
                  />
                </td>
                <td style={td}>
                  <input
                    type="number"
                    step="0.01"
                    style={input}
                    value={it.price}
                    disabled={readOnly}
                    onChange={(e) => setItem(i, { price: Number(e.target.value) })}
                  />
                </td>
                <td style={td}>
                  <input
                    type="number"
                    step="0.01"
                    style={input}
                    value={it.vat}
                    disabled={readOnly}
                    onChange={(e) => setItem(i, { vat: Number(e.target.value) })}
                  />
                </td>
                <td style={td}>
                  {!readOnly && (
                    <button onClick={() => removeItem(i)} style={btnDanger}>
                      מחק
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!readOnly && (
          <button onClick={addItem} style={btnSecondary}>
            הוסף שורה
          </button>
        )}
      </fieldset>

      <fieldset style={fieldset}>
        <legend>סיכום</legend>
        <Row label="סכום ביניים">
          <input
            type="number"
            style={input}
            value={value.subtotal ?? ''}
            disabled={readOnly}
            onChange={(e) => set('subtotal', e.target.value ? Number(e.target.value) : undefined)}
          />
        </Row>
        <Row label="מע&quot;מ">
          <input
            type="number"
            style={input}
            value={value.vatTotal ?? ''}
            disabled={readOnly}
            onChange={(e) => set('vatTotal', e.target.value ? Number(e.target.value) : undefined)}
          />
        </Row>
        <Row label="סה&quot;כ לתשלום">
          <input
            type="number"
            style={input}
            value={value.total}
            disabled={readOnly}
            onChange={(e) => set('total', Number(e.target.value))}
          />
        </Row>
      </fieldset>
    </div>
  );
};

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', gap: 8, marginBottom: 8 }}>
    <span style={{ color: '#444' }}>{label}</span>
    {children}
  </label>
);

const fieldset: React.CSSProperties = { border: '1px solid #ddd', borderRadius: 8, padding: 16, background: '#fff' };
const input: React.CSSProperties = { padding: '6px 8px', border: '1px solid #ccc', borderRadius: 4, fontFamily: 'inherit', textAlign: 'right' };
const th: React.CSSProperties = { textAlign: 'right', padding: 8, borderBottom: '1px solid #eee', fontWeight: 600 };
const td: React.CSSProperties = { padding: 6, borderBottom: '1px solid #f3f3f3' };
const btnDanger: React.CSSProperties = { background: '#e74c3c', color: 'white', border: 0, padding: '4px 10px', borderRadius: 4, cursor: 'pointer' };
const btnSecondary: React.CSSProperties = { marginTop: 12, background: '#ecf0f1', border: '1px solid #ccc', padding: '6px 14px', borderRadius: 4, cursor: 'pointer' };
