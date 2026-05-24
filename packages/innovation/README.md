# @syncup/innovation

חבילת חדשנות (Innovation Lab) של פלטפורמת Sync Up Catering.

מטרת החבילה: לרכז יכולות "ניסיוניות / חדישות" באריזה אחת מודולרית — כך שאפליקציות הלקוח (Web, Mobile, Kitchen Display) יוכלו לצרוך אותן בנפרד, מבלי לכפות תלות מלאה.

## מודולים

| מודול | תיאור | מצב |
|------|------|----|
| `ai-image` | יצירת תמונות אוטומטית לפריטי תפריט (Stable Diffusion stub + תיאורים מ-Anthropic Vision) | יציב למעט שילוב מודל אמיתי |
| `qr` | QR לכל הזמנה / חשבונית / אירוע / לקוח / משלוח / ציוד / רכב / עובד + Scanner | יציב |
| `passkeys` | רישום והתחברות WebAuthn / Passkeys + קודי שחזור | יציב |
| `ar` | Menu AR — `<model-viewer>` של גוגל + פריטי תפריט ב-GLB | placeholders |
| `plate-quality` | ניתוח איכות הגשה ב-Claude Vision (פרזנטציה, מנה, פלייטינג, טריות) + Alert | יציב |
| `kitchen-voice` | פקודות קוליות למטבח (סמן הושלם / הוסף הערה / משימה הבאה / קרא מלצר) | יציב |
| `drone` | Stub Provider למשלוחי רחפן/זיפליין | stub |
| `blockchain` | Stub לעיגון חוזים על שרשרת + Merkle Audit + IPFS | stub |
| `rpa` | Robotic Process Automation: iCount, פיוס בנקאי, דיווח 102/126 | stubs בסיסיים |

## התקנה

```bash
pnpm add @syncup/innovation
```

## דוגמת שימוש

```ts
import { QRGenerator } from "@syncup/innovation/qr";
import { PasskeyManager } from "@syncup/innovation/passkeys";
import { PlateQualityAnalyzer } from "@syncup/innovation/plate-quality";

const qr = await QRGenerator.forOrder("ORD-12345");
const passkey = new PasskeyManager({ rpId: "syncup.co.il", rpName: "Sync Up" });
const analyzer = new PlateQualityAnalyzer({ apiKey: process.env.ANTHROPIC_API_KEY! });
```

## בדיקות

```bash
pnpm test
```

## רישיון

MIT — Sync Up.
