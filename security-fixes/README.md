# security-fixes

<div dir="rtl">

חבילת תיקוני P0 לעמידה בחוקי ישראל ובדרישות אבטחה.

מפת הקבצים:

- `FIXES-APPLIED.md` — מה תוקן, איפה ליישם בכל worktree.
- `SECURITY-RUNBOOK.md` — תגובה לאירועים, רשימות תיוג.
- `packages/*` — 13 חבילות TypeScript עצמאיות, כל אחת עם tests.

הרצה:

```bash
npm install
npm test
```

## חבילות

| # | Package | תפקיד |
|---|--------|------|
| 1 | vat | שיעור מע"מ ישראלי (18% ב-2025) |
| 2 | privacy | SAR + מחיקה/אנונימיזציה |
| 3 | archival | ארכיון 7 שנים ב-R2 |
| 4 | invoicing-fallback | iCount → GreenInvoice → Rivhit |
| 5 | tax-reports | טפסים 106/102/126 Mai101 |
| 6 | consent-ledger | double-opt-in + hash-chain |
| 7 | jwt-config | secrets חזקים + refresh 15min |
| 8 | otp | crypto.randomInt + lockout |
| 9 | kms-client | envelope encryption (KMS/Vault) |
| 10 | cookies | Secure + HttpOnly + SameSite=Strict |
| 11 | 2fa-enforcement | חסימת admin בלי 2FA |
| 12 | pci-validator | בדיקת דליפת PAN/CVV |
| 13 | xss-sanitizer | DOMPurify wrapper |

ראה `FIXES-APPLIED.md` להוראות פריסה מלאות.

</div>
