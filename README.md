# 🍽️ Catering System — מערכת ERP מקיפה לעסק קייטרינג ישראלי

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/bot-sync-up/catering-system/actions)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.0--alpha-orange)](https://github.com/bot-sync-up/catering-system/releases)
[![Contributors](https://img.shields.io/badge/contributors-Sync%20Up-purple)](#contributors)

> פלטפורמת ERP בעברית מלאה לעסקי קייטרינג — הזמנות, ניהול תפריט, לוגיסטיקה, חשבונאות, AI, סוכן קולי טלפוני, אפליקציות נייטיב iOS/Android, ועוד.

---

## 📋 תוכן עניינים

- [סקירה כללית](#סקירה-כללית)
- [תכונות עיקריות](#תכונות-עיקריות)
- [Quick Start](#quick-start)
- [מבנה הפרויקט](#מבנה-הפרויקט)
- [Contributing](#contributing)
- [Roadmap](#roadmap)
- [רישיון](#רישיון)

---

## סקירה כללית

מערכת ERP **end-to-end** לעסקי קייטרינג בישראל, הכוללת:

- **ליבת ERP** — לקוחות, אירועים, תפריטים, מחירים
- **לוגיסטיקה** — כלי הגשה, נהגים, מסלולים
- **חשבונאות ישראלית** — חשבוניות מס מס׳ סידורי, iCount, CardCom, מע״מ
- **AI Suite** — 8 מודולי AI (תפריט מותאם, חיזוי ביקוש, תמחור דינמי, צ׳אטבוט עברית)
- **סוכן קולי טלפוני** — Gemini Live + OpenAI Realtime בעברית
- **אפליקציות נייטיב** — iOS (SwiftUI) + Android (Kotlin)
- **i18n** — תמיכה ב-5 שפות (עברית, אנגלית, ערבית, רוסית, צרפתית)
- **Marketplace** — אינטגרציות צד-שלישי

---

## תכונות עיקריות

| מודול | תיאור | סטטוס |
|------|------|------|
| `@catering/core` | מודלים בסיסיים — לקוח, אירוע, פריט תפריט | ✅ Alpha |
| `@catering/orders` | זרימת הזמנה: הצעת מחיר → אישור → אספקה | ✅ Alpha |
| `@catering/logistics` | תכנון מסלולים, ניהול נהגים | ✅ Alpha |
| `@catering/billing` | חשבונאות ישראלית (iCount/CardCom) | 🟡 Beta |
| `@syncup/ai-suite` | 8 מודולי AI לפלטפורמת קייטרינג | ✅ Alpha |
| `@catering/voice-ordering` | מערכת הזמנות קולית בעברית | ✅ Alpha |
| `@catering/i18n` | תמיכת רב-לשונית מלאה ב-5 שפות | ✅ Alpha |
| `apps/ios-catering` | אפליקציית iOS — SwiftUI + MVVM | ✅ Alpha |
| `apps/android-catering` | אפליקציית Android נייטיב | ✅ Alpha |
| `@catering/integrations-marketplace` | מרקטפלייס פלאגינים | ✅ Alpha |

---

## Quick Start

### דרישות מקדימות

- Node.js ≥ 20
- pnpm ≥ 9
- PostgreSQL 16
- Redis 7
- Docker (אופציונלי)

### התקנה לוקאלית

```bash
git clone https://github.com/bot-sync-up/catering-system.git
cd catering-system

# הפעלת סקריפט בוטסטרפ
bash install-local.sh

# או ידנית:
pnpm install
cp .env.example .env
# ערוך את .env
pnpm dev
```

### Docker

```bash
docker compose up -d
```

הממשק זמין ב: http://localhost:3000

---

## מבנה הפרויקט

```
catering-system/
├── apps/                  # אפליקציות סופיות
│   ├── web/              # Next.js dashboard
│   ├── ios-catering/     # iOS app (SwiftUI)
│   ├── android-catering/ # Android app (Kotlin)
│   └── admin/            # ממשק ניהול
├── packages/              # חבילות משותפות
│   ├── core/             # מודלים בסיסיים
│   ├── orders/           # זרימת הזמנות
│   ├── logistics/        # לוגיסטיקה
│   ├── billing/          # חשבונאות ישראלית
│   ├── ai-suite/         # 8 מודולי AI
│   ├── voice-ordering/   # סוכן קולי
│   ├── i18n/             # רב-לשוני
│   └── integrations-marketplace/
├── services/              # מיקרו-שירותים
├── infra/                 # תשתית (Terraform, Helm)
├── docs/                  # תיעוד מפורט
└── .github/               # CI/CD + automations
```

---

## Contributing

ראה [CONTRIBUTING.md](CONTRIBUTING.md).

- כל PR דורש review של CODEOWNER (`@bot-sync-up`).
- כל הודעת commit חייבת להיות **בעברית**.
- בדיקות אוטומטיות: `pnpm test && pnpm lint`.

---

## Roadmap

| Phase | יעד | תאריך יעד |
|-------|-----|-----------|
| Phase 0 — Critical Fixes | תיקוני P0 + אבטחה | Q2 2026 |
| Phase 1 — Core Live | הזמנות + חשבונאות חיות | Q3 2026 |
| Phase 2 — AI + Voice | AI Suite + סוכן קולי | Q4 2026 |
| Phase 3 — Mobile + i18n | אפליקציות נייטיב + רב-לשוני | Q1 2027 |
| Phase 4 — Marketplace | אינטגרציות צד-שלישי | Q2 2027 |

[ראה Roadmap מלא](https://github.com/bot-sync-up/catering-system/projects)

---

## Contributors

נבנה ומתוחזק על ידי [Sync Up](https://syncup.co.il) — חברת הטכנולוגיה של משה דושינסקי.

📧 [info@syncup.co.il](mailto:info@syncup.co.il)
🌐 [https://syncup.co.il](https://syncup.co.il)

---

## רישיון

MIT © 2026 Sync Up
