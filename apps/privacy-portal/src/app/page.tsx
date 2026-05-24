export default function HomePage() {
  return (
    <section>
      <h1>פורטל פרטיות</h1>
      <p>
        בהתאם לתיקון 13 לחוק הגנת הפרטיות (אוגוסט 2025), עומדות לרשותך הזכויות הבאות לגבי המידע
        האישי שלנו אודותיך:
      </p>
      <ul>
        <li>
          <strong>זכות עיון —</strong> <a href="/portal/my-data">לבקש העתק של כל המידע שלך</a>
        </li>
        <li>
          <strong>זכות להישכח —</strong> <a href="/portal/erasure">בקשת מחיקה / אנונימיזציה</a>
        </li>
        <li>
          <strong>ניהול הסכמות —</strong> <a href="/portal/consents">הסרת הסכמה לפניות שיווקיות</a>
        </li>
      </ul>
      <div className="alert">
        חלק מן המידע (כגון חשבוניות מס) מחוייב בשמירה משפטית של 7 שנים ויעבור אנונימיזציה במקום
        מחיקה מלאה. פרטים מלאים במסמך{" "}
        <code>DATA-RETENTION-POLICY.md</code>.
      </div>
    </section>
  );
}
