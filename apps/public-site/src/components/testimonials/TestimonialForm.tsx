'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Star, Send, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const Schema = z.object({
  name: z.string().min(2, 'שם קצר מדי'),
  role: z.string().max(80).optional(),
  rating: z.coerce.number().int().min(1).max(5),
  content: z.string().min(20, 'נדרשים לפחות 20 תווים').max(800),
  consent: z.literal(true, { errorMap: () => ({ message: 'נדרש לאשר פרסום' }) }),
});

type FormData = z.infer<typeof Schema>;

export function TestimonialForm() {
  const [done, setDone] = useState(false);
  const [hover, setHover] = useState(0);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(Schema),
    defaultValues: { rating: 5, consent: false as unknown as true },
  });
  const rating = watch('rating');

  const onSubmit = async (data: FormData) => {
    const res = await fetch('/api/testimonials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) setDone(true);
  };

  if (done) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card flex items-center gap-3">
        <CheckCircle2 className="text-green-600" />
        <div>
          <h3 className="font-semibold">תודה! ההמלצה התקבלה.</h3>
          <p className="text-sm text-ink-muted">היא תופיע באתר לאחר אישור מודרציה.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4" aria-label="טופס הגשת המלצה">
      <h3 className="text-xl font-semibold">שתפו אותנו בחוויה</h3>
      <p className="text-sm text-ink-muted">נפרסם רק המלצות באישור, 4 כוכבים ומעלה.</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="t-name">שם מלא</label>
          <input id="t-name" className="input" {...register('name')} aria-invalid={!!errors.name} />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div>
          <label className="label" htmlFor="t-role">תפקיד / סוג אירוע</label>
          <input id="t-role" className="input" placeholder="חתונה, מסחרי, פורטרט..." {...register('role')} />
        </div>
      </div>

      <div>
        <span className="label">דירוג</span>
        <div className="flex items-center gap-1" role="radiogroup" aria-label="דירוג כוכבים">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setValue('rating', n as 1 | 2 | 3 | 4 | 5, { shouldValidate: true })}
              className="rounded-full p-1"
              aria-label={`${n} כוכבים`}
            >
              <Star
                size={28}
                className={n <= (hover || rating) ? 'fill-yellow-400 text-yellow-400' : 'text-black/20'}
              />
            </button>
          ))}
          <input type="hidden" {...register('rating', { valueAsNumber: true })} />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="t-content">תוכן ההמלצה</label>
        <textarea id="t-content" rows={4} className="input" {...register('content')} aria-invalid={!!errors.content} />
        {errors.content && <p className="mt-1 text-xs text-red-600">{errors.content.message}</p>}
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1 h-4 w-4 rounded border-black/20" {...register('consent')} />
        <span>אני מאשר/ת פרסום שמי ותוכן ההמלצה באתר.</span>
      </label>
      {errors.consent && <p className="text-xs text-red-600">{errors.consent.message as string}</p>}

      <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
        <Send size={16} /> שלח המלצה
      </button>
    </form>
  );
}
