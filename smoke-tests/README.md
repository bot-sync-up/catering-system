# Smoke Tests

הרצה מהירה:

```bash
bash scripts/run-smoke.sh         # full suite
bash scripts/run-smoke.sh quick   # ~30s
```

ראה [`SMOKE-RUNBOOK.md`](./SMOKE-RUNBOOK.md) למתי להריץ מה.

## מבנה

```
smoke-tests/
├── scripts/
│   └── run-smoke.sh              # מפעיל ראשי, מספור צבעוני
├── tests/
│   ├── integration/              # 11 vitest tests (DB, Redis, auth, RBAC, audit, VAT, CardCom, iCount, bus, SAGA)
│   ├── health/                   # /health על כל app
│   ├── security/                 # ENV, secrets, gitleaks
│   └── e2e-quick/                # Playwright: login + dashboard
├── dashboards/
│   ├── smoke-results.html        # דשבורד RTL בעברית
│   └── generate-html.sh          # מייצר את הדשבורד מ-JSON
├── SMOKE-RUNBOOK.md              # מתי להריץ מה
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## CI

ראה [`.github/workflows/smoke.yml`](../.github/workflows/smoke.yml) — רץ אוטומטית על PR + merge ל-main + nightly 3:00.
