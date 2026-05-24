import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="section">
      <div className="container-x max-w-xl text-center">
        <p className="text-sm font-semibold text-brand-600">404</p>
        <h1 className="mt-2 font-display text-4xl font-bold">העמוד לא נמצא</h1>
        <p className="mt-3 text-ink-muted">ייתכן שהקישור ישן, או שטעית בכתובת. אפשר לחזור לדף הבית.</p>
        <Link href="/" className="btn-primary mt-6">חזרה לדף הבית</Link>
      </div>
    </section>
  );
}
