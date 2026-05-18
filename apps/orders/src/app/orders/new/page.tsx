'use client';

import { useState } from 'react';

interface ItemDraft {
  productSku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  kitchenInstructions?: string;
}

export default function NewOrderPage() {
  const [type, setType] = useState('ONE_TIME_EVENT');
  const [channel, setChannel] = useState('PORTAL');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [guestCount, setGuestCount] = useState(0);
  const [items, setItems] = useState<ItemDraft[]>([
    { productSku: '', productName: '', quantity: 1, unitPrice: 0 },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function updateItem(idx: number, patch: Partial<ItemDraft>) {
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type,
        channel,
        customer: { fullName, phone },
        eventDate: eventDate || undefined,
        eventLocation: eventLocation || undefined,
        guestCount: guestCount || undefined,
        items,
      }),
    });
    const json = await res.json();
    if (res.ok) {
      setMessage(`הזמנה נוצרה: ${json.data.orderNumber}`);
    } else {
      setMessage(`שגיאה: ${JSON.stringify(json)}`);
    }
    setSubmitting(false);
  }

  return (
    <div className="card">
      <h2>הזמנה חדשה</h2>
      <form onSubmit={submit}>
        <div className="row">
          <div>
            <label>סוג הזמנה</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="ONE_TIME_EVENT">אירוע חד-פעמי</option>
              <option value="RECURRING_PLAN">מנוי קבוע</option>
              <option value="MONTHLY_SUBSCRIPTION">מנוי חודשי</option>
            </select>
          </div>
          <div>
            <label>ערוץ</label>
            <select value={channel} onChange={(e) => setChannel(e.target.value)}>
              <option value="PORTAL">פורטל</option>
              <option value="PHONE">טלפון</option>
              <option value="WHATSAPP">ווטסאפ</option>
              <option value="AGENT">סוכן</option>
            </select>
          </div>
        </div>

        <div className="row">
          <div>
            <label>שם הלקוח</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div>
            <label>טלפון</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>
        </div>

        {type === 'ONE_TIME_EVENT' && (
          <>
            <div className="row">
              <div>
                <label>תאריך אירוע</label>
                <input type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
              </div>
              <div>
                <label>מספר אורחים</label>
                <input type="number" min={0} value={guestCount} onChange={(e) => setGuestCount(parseInt(e.target.value) || 0)} />
              </div>
            </div>
            <label>מיקום</label>
            <input value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} />
          </>
        )}

        <h3>פריטים</h3>
        {items.map((it, idx) => (
          <div key={idx} className="row" style={{ alignItems: 'flex-end' }}>
            <div>
              <label>קוד מוצר</label>
              <input value={it.productSku} onChange={(e) => updateItem(idx, { productSku: e.target.value })} />
            </div>
            <div>
              <label>שם מוצר</label>
              <input value={it.productName} onChange={(e) => updateItem(idx, { productName: e.target.value })} />
            </div>
            <div>
              <label>כמות</label>
              <input type="number" min={1} value={it.quantity} onChange={(e) => updateItem(idx, { quantity: parseInt(e.target.value) || 1 })} />
            </div>
            <div>
              <label>מחיר יחידה</label>
              <input type="number" min={0} step="0.01" value={it.unitPrice} onChange={(e) => updateItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
        ))}
        <p>
          <button type="button" className="btn btn-secondary" onClick={() => setItems((arr) => [...arr, { productSku: '', productName: '', quantity: 1, unitPrice: 0 }])}>
            + הוסף פריט
          </button>
        </p>

        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? 'שולח...' : 'שלח הזמנה'}
        </button>
        {message && <p className="muted">{message}</p>}
      </form>
    </div>
  );
}
