# 🤝 תרומה לפרויקט

תודה על הרצון לתרום! להלן ההנחיות לעבודה תקינה בריפו.

## כללי זהב

1. **שפה** — כל הודעת commit ו-PR חייבת להיות **בעברית**.
2. **CODEOWNERS** — כל PR דורש review של `@bot-sync-up`.
3. **Branches** — לא נדחפים ישירות ל-`main`.
4. **Tests** — לפני PR: `pnpm test && pnpm lint`.

## זרימת עבודה

```bash
git checkout -b feat/short-description
# עורך את הקוד...
git add -p
git commit -m "feat(module): תיאור קצר בעברית"
git push -u origin feat/short-description
# פתח PR ב-GitHub
```

## Conventional Commits — בעברית

| Prefix | מתי |
|--------|-----|
| `feat:` | פיצ׳ר חדש |
| `fix:` | תיקון באג |
| `docs:` | תיעוד בלבד |
| `refactor:` | שינוי קוד ללא שינוי התנהגות |
| `test:` | הוספת/תיקון בדיקות |
| `chore:` | תחזוקה |

דוגמה: `feat(billing): הוספת תמיכה בחשבונית מס מס׳ סידורי`

## דיווח באגים

פתח Issue עם:
- כותרת ברורה
- צעדים לשחזור
- התנהגות צפויה vs בפועל
- סביבה (OS, Node, DB)
- labels מתאימים (`type:bug`, `priority:p*`, `module:*`)

## אבטחה

אל **תפתח Issue ציבורי לבעיות אבטחה**. שלח מייל ל-security@syncup.co.il.
