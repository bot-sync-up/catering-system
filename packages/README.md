# packages/ — חבילות משותפות

חבילות פנימיות בלבד (`private: true`) — אינן מתפרסמות ל-npm.
הן נצרכות על-ידי `apps/*` ו-`services/*` דרך `workspace:*`.

## מבנה

```
packages/
├── db/              # @catering/db        — Prisma client, schema, migrations
├── auth/            # @catering/auth      — JWT, סשנים, RBAC, middleware
├── audit/           # @catering/audit     — Audit log, event sourcing
├── contracts/       # @catering/contracts — Zod schemas, types בין-שירותיים
├── ui/              # @catering/ui        — React components (RTL, Tailwind, shadcn)
├── queue/           # @catering/queue     — BullMQ producers/consumers
├── utils/           # @catering/utils     — תאריכים עבריים, מטבע, אזורי זמן
├── config/          # @catering/config    — טעינת ENV עם validation
└── integrations/
    ├── icount/      # @catering/integrations-icount   — חשבוניות iCount
    ├── cardcom/     # @catering/integrations-cardcom  — סליקה Cardcom
    ├── email/       # @catering/integrations-email    — SendGrid
    ├── sms/         # @catering/integrations-sms      — Twilio
    ├── whatsapp/    # @catering/integrations-whatsapp — WhatsApp Business
    └── storage/     # @catering/integrations-storage  — Cloudflare R2 / S3
```

## מקור (worktrees → packages)

| Package                              | מקור worktree                          |
|--------------------------------------|----------------------------------------|
| `packages/db`                        | 02 DB `agent-abcfc839a28d7b588`        |
| `packages/auth`                      | 03 Auth `agent-a0d949436df27ed12`      |
| `packages/audit`                     | 04 Audit `agent-a5e9ec7d29999be9c`     |
| `packages/contracts`                 | חדש — נבנה ממוצעי כל המודולים          |
| `packages/ui`                        | חדש — חילוץ רכיבים משותפים מ-apps      |
| `packages/queue`                     | חדש — מאוחד מ-12 OCR + 22 BI + 23 Mkt  |
| `packages/utils`                     | חדש — חילוץ helpers נפוצים             |
| `packages/config`                    | חדש                                    |
| `packages/integrations/icount`       | 18 `agent-accb121134afd7c1a`           |
| `packages/integrations/cardcom`      | 19 `agent-a91fe015c553e924f`           |
| `packages/integrations/email`        | חלק מ-23 `agent-a7f6f8c320f0b1219`     |
| `packages/integrations/sms`          | חלק מ-23 `agent-a7f6f8c320f0b1219`     |
| `packages/integrations/whatsapp`     | חלק מ-23 `agent-a7f6f8c320f0b1219`     |
| `packages/integrations/storage`      | חדש — מאוחד (12 OCR, 17 חשבוניות, 25 mobile uploads) |

## חוקי תלות

- `db`, `utils`, `config` הם **שכבת בסיס** — לא תלויים בחבילות אחרות.
- `auth`, `audit`, `queue`, `contracts` מותר להם לתלות ב-בסיס בלבד.
- `ui` תלוי ב-`utils` בלבד (אסור גישה ל-DB מ-UI).
- `integrations/*` תלויים ב-`config` + `utils` בלבד.
- אסור circular dependencies.
