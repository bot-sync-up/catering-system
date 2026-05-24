# הוראה: סריקה ועדכון מע"מ גלובלי

## רקע (RTL)
החל מ-01/01/2025 שיעור מע"מ בישראל הוא **18%** (במקום 17%).
יש לעדכן כל קובץ שמכיל את הערכים הבאים, כדי להבטיח שחשבוניות וחישובים יהיו תקינים.

## פקודה לסריקה (Bash / PowerShell)

```bash
# סריקה כל הקבצים בעלי מע"מ 17 — לא כולל node_modules, dist, .git
grep -rEn --include='*.{ts,tsx,js,jsx,json,env,env.example,yml,yaml,md,sql,prisma}' \
  --exclude-dir={node_modules,dist,.git,.next,build,coverage} \
  -- '(vat[^a-zA-Z]*[:=]\s*0?\.?17|VAT_RATE\s*=\s*0\.17|vatRate.*17|17%|"vat":\s*17|0\.17)' .
```

```powershell
# גרסת PowerShell
Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js,*.jsx,*.json,*.env,*.env.example,*.yml,*.yaml,*.md,*.sql,*.prisma `
  -Exclude node_modules,dist,.git,.next,build,coverage |
  Select-String -Pattern '(vat[^a-zA-Z]*[:=]\s*0?\.?17|VAT_RATE\s*=\s*0\.17|vatRate.*17|17%|"vat":\s*17|0\.17)'
```

## כללי החלפה

| מקור | יעד | הערה |
|------|-----|------|
| `VAT_RATE=0.17` | `VAT_RATE=0.18` | env files |
| `vat: 17` | `vat: 18` | JSON / objects |
| `vatRate: 17` | `vatRate: 18` | TS/JS |
| `default(17)` (במקרים של vatRate בלבד) | `default(18)` | zod / schema |
| `0.17` בהקשר מע"מ | `0.18` | בהקשר חישוב — לא כל 0.17 קשור למע"מ! |
| תיעוד "17%" בהקשר מע"מ | "18%" | docs |

## אזהרה (RTL)

לפני החלפה אוטומטית של `0.17` — חובה לוודא שזה אכן מע"מ ולא חישוב אחר
(לדוגמה: ריבית, אחוז עמלה, מקדם תיחור וכו').

## פקודה ל-replace ב-Git Bash (בזהירות)

```bash
# רק על קבצי env ו-types ידועים
find . -type f \( -name '.env*' -o -name 'index.ts' \) \
  -not -path '*/node_modules/*' \
  -exec grep -l 'VAT_RATE=0.17\|vatRate.*17' {} + \
  | xargs -r sed -i 's/VAT_RATE=0\.17/VAT_RATE=0.18/g; s/vatRate.*default(17)/vatRate.default(18)/g'
```
