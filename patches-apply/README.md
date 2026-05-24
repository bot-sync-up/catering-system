# patches-apply

<div dir="rtl">

חבילת ה-patches לאיחוד המונורפו של Catering (`catering-monorepo/`).
החבילה מקבצת את **כל ה-patches** מסוכני האיטום (Sealing 3) והאינטגרציה
(VAT migration, Audit Enforcement, Cardcom, iCount, Privacy Portal) שיש להחיל
על ה-monorepo המאוחד, וכוללת סקריפטים אוטומטיים להחלה+אימות+רולבק.

## מבנה

```
patches-apply/
├── MASTER-PATCHES.md      # תיעוד מלא של כל ה-10 patches
├── PATCH-CHECKLIST.md     # checklist ידני אחרי אוטומציה
├── verify-patches.ts      # אימות אוטומטי + דוח JSON
├── README.md              # זה
└── scripts/
    ├── apply-all-patches.sh   # batch sed-replacements
    ├── inject-audit.ts        # הזרקת audit middleware ל-PrismaClient
    ├── migrate-imports.ts     # @aneh-hashoel/* → @catering/*
    └── rollback.sh            # החזרה במקרה תקלה
```

## שימוש מהיר

```bash
# 1. clone של המונורפו המאוחד
git clone <merged-monorepo>
cd merged-monorepo
git checkout -b chore/apply-patches

# 2. הפעלת ה-patches
bash patches-apply/scripts/apply-all-patches.sh .
ts-node patches-apply/scripts/inject-audit.ts .
ts-node patches-apply/scripts/migrate-imports.ts .

# 3. אימות
ts-node patches-apply/verify-patches.ts . > verify-report.json
jq '.status' verify-report.json    # צריך "PASS"

# 4. בדיקה
pnpm install
pnpm typecheck
pnpm test

# 5. אם משהו רע
bash patches-apply/scripts/rollback.sh .
```

## רשימת Patches

| # | Patch | סקריפט |
|---|-------|---------|
| 1 | VAT 17% → 18% | apply-all-patches.sh |
| 2 | JWT_SECRET חזק | apply-all-patches.sh |
| 3 | OTP crypto.randomInt | apply-all-patches.sh (warns) |
| 4 | Cookie Secure+HttpOnly+SameSite | apply-all-patches.sh (warns) |
| 5 | 2FA חובה למנהלים | apply-all-patches.sh (warns) |
| 6 | Cardcom Zero-PCI | apply-all-patches.sh (warns) |
| 7 | XSS sanitizer | apply-all-patches.sh (warns) |
| 8 | Audit middleware injection | inject-audit.ts |
| 9 | Privacy endpoints integration | apply-all-patches.sh (warns) |
| 10 | Migrate imports | migrate-imports.ts |

> **"warns"** = הסקריפט לא משנה אוטומטית (דורש שינוי import או schema),
> רק יוצר אזהרה ב-log. ראה PATCH-CHECKLIST.md לפעולה הידנית הנדרשת.

## מקורות (sources)

| Worktree | תוכן |
|----------|------|
| `agent-ae12d76f8b5390803` | F1 Monorepo (target) |
| `agent-a3a11a087ec5a2e42/security-fixes` | 13 חבילות אבטחה P0 |
| `agent-ab161962f128a986d` | VAT migration + scan + SQL |
| `agent-a4d9d36dec6e4234c/packages/audit-enforcement` | Audit middleware |
| `agent-a1c20bc1bd0cedd28/packages/integrations/cardcom-production` | Cardcom SDK |
| `agent-a7174d6ed144e4112/packages/integrations/icount-production` | iCount SDK |
| `agent-a58118e7d348be81b/apps/privacy-portal` | Privacy portal |

</div>
