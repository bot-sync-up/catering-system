export default function HomePage() {
  return (
    <main className="container mx-auto flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="font-serif text-5xl font-bold">ענה את השואל</h1>
      <p className="max-w-xl text-lg text-muted-foreground">
        פלטפורמת שאלות ותשובות לרבנים מבית המרכז למורשת מרן.
      </p>
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">
          Sprint 0 — תשתית מוכנה. הסביבה רצה במצב RTL מלא.
        </p>
      </div>
    </main>
  );
}
