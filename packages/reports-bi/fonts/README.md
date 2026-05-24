# Fonts

ה-PDF builder משתמש בפונט **Heebo** של Google Fonts (תומך עברית מלאה, רישיון OFL).

## התקנה

```bash
curl -L -o Heebo-Regular.ttf https://fonts.gstatic.com/s/heebo/v26/NGS6v5_NC0k9P9H4TbZqkA.ttf
curl -L -o Heebo-Bold.ttf https://fonts.gstatic.com/s/heebo/v26/NGS4v5_NC0k9P-HrTLpwY3Y.ttf
```

או הורידו ידנית מ-<https://fonts.google.com/specimen/Heebo> והעתיקו ל-`packages/reports-bi/fonts/`.

> אם הפונטים חסרים, ה-builder נופל ל-default font של pdfkit (Helvetica).
> זה אומר שעברית לא תוצג כראוי — תתקינו את הפונטים לפני שמשתמשים ב-PDF builder בפרודקשן.
