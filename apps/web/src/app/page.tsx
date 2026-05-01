export default function HomePage() {
  return (
    <main className="container mx-auto flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="max-w-2xl text-center">
        <h1 className="font-serif text-5xl font-bold text-primary-900 md:text-6xl">
          ענה את השואל
        </h1>
        <p className="mt-6 text-xl leading-relaxed text-gray-700">
          פלטפורמת שאלות ותשובות לרבנים
        </p>
        <p className="mt-2 text-sm text-gray-500">
          המרכז למורשת מרן
        </p>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="font-semibold text-primary-700">שאל שאלה</h2>
            <p className="mt-2 text-sm text-gray-600">
              שלח שאלה הלכתית לרבני המוסד
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="font-semibold text-primary-700">חיפוש בארכיון</h2>
            <p className="mt-2 text-sm text-gray-600">
              חפש בתשובות שכבר ניתנו
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="font-semibold text-primary-700">אזור רב</h2>
            <p className="mt-2 text-sm text-gray-600">
              כניסה לרבנים ועורכים
            </p>
          </div>
        </div>

        <p className="mt-12 text-xs text-gray-400">
          Sprint 0 · תשתית ראשונית
        </p>
      </div>
    </main>
  );
}
