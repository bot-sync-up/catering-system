'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send, CheckCircle2, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

const Schema = z.object({
  name: z.string().min(2, 'שם קצר מדי').max(80),
  email: z.string().email('כתובת אימייל לא תקינה'),
  phone: z.string().regex(/^[0-9+\-\s()]{7,20}$/, 'מספר טלפון לא תקין'),
  service: z.enum(['חתונה', 'בר/בת מצווה', 'משפחה', 'מסחרי', 'אירוע עסקי', 'אחר']),
  eventDate: z.string().optional(),
  message: z.string().min(10, 'נדרשים לפחות 10 תווים').max(2000),
  // Honeypot
  hp: z.string().max(0).optional(),
});

type FormData = z.infer<typeof Schema>;

export function ContactForm() {
  const [state, setState] = useState<'idle' | 'success' | 'error'>('idle');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(Schema) });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('failed');
      setState('success');
    } catch {
      setState('error');
    }
  };

  if (state === 'success') {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card flex items-center gap-3">
        <CheckCircle2 className="text-green-600" />
        <div>
          <h3 className="font-semibold">תודה! פנייתך התקבלה.</h3>
          <p className="text-sm text-ink-muted">נחזור אליך תוך יום עסקים.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4" aria-label="טופס יצירת קשר">
      {/* Honeypot — invisible to humans, catches bots */}
      <div className="hidden" aria-hidden>
        <label>אל תמלא <input tabIndex={-1} autoComplete="off" {...register('hp')} /></label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="c-name">שם מלא *</label>
          <input id="c-name" className="input" autoComplete="name" {...register('name')} aria-invalid={!!errors.name} />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div>
          <label className="label" htmlFor="c-phone">טלפון *</label>
          <input id="c-phone" className="input" inputMode="tel" autoComplete="tel" {...register('phone')} aria-invalid={!!errors.phone} />
          {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="c-email">אימייל *</label>
        <input id="c-email" type="email" className="input" autoComplete="email" {...register('email')} aria-invalid={!!errors.email} />
        {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="c-service">סוג שירות *</label>
          <select id="c-service" className="input" {...register('service')}>
            <option value="חתונה">חתונה</option>
            <option value="בר/בת מצווה">בר/בת מצווה</option>
            <option value="משפחה">משפחה</option>
            <option value="מסחרי">מסחרי</option>
            <option value="אירוע עסקי">אירוע עסקי</option>
            <option value="אחר">אחר</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="c-date">תאריך אירוע</label>
          <input id="c-date" type="date" className="input" {...register('eventDate')} />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="c-message">מה תרצו לספר לנו? *</label>
        <textarea id="c-message" rows={5} className="input" {...register('message')} aria-invalid={!!errors.message} />
        {errors.message && <p className="mt-1 text-xs text-red-600">{errors.message.message}</p>}
      </div>

      {state === 'error' && (
        <div className="flex items-center gap-2 rounded-2xl bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle size={16} /> שגיאה בשליחה. אפשר לנסות שוב או לשלוח מייל ישירות.
        </div>
      )}

      <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
        <Send size={16} /> שלח פנייה
      </button>
      <p className="text-xs text-ink-subtle">בשליחה את/ה מסכים/ה למדיניות הפרטיות שלנו.</p>
    </form>
  );
}
