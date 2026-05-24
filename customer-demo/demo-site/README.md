<div dir="rtl">

# Demo Site — Self-Service Trial

אתר Next.js שמאפשר ל-prospect להירשם לדמו חינם ל-7 ימים. ה-tenant נוצר אוטומטית, התראה ל-CSM, מייל ברוך הבא.

## מבנה

```
demo-site/
├── README.md                    ← זה
├── package.json
├── next.config.mjs
├── pages/
│   ├── index.tsx                ← דף נחיתה
│   ├── thank-you.tsx            ← לאחר רישום
│   └── api/
│       ├── request-demo.ts      ← יצירת tenant אוטומטית
│       └── extend-demo.ts       ← בקשה להאריך
├── components/
│   ├── SignupForm.tsx
│   ├── FeaturesGrid.tsx
│   ├── Testimonials.tsx
│   └── PricingCard.tsx
└── public/
    ├── logo.svg
    └── og-image.png
```

## הקמה לוקלית

```bash
cd customer-demo/demo-site
pnpm install
cp .env.example .env.local
# ערוך את .env.local עם ה-tokens
pnpm dev
```

## הגדרות סביבה (`.env.local`)

```
NEXT_PUBLIC_BASE_URL=https://try.syncup.co.il
SYNCUP_API_BASE=https://api.syncup.co.il
SYNCUP_ADMIN_TOKEN=<provisioning_scope_token>
SENDGRID_API_KEY=<key>
HCAPTCHA_SECRET=<key>
SLACK_WEBHOOK_CSM=<webhook_url>
```

## פריסה

- **Hosting:** Vercel (free tier מספיק לתחילה, Pro כשנעלה ל-1K+ הרשמות יומיות)
- **DNS:** `try.syncup.co.il` → Vercel
- **CDN:** Vercel Edge Network (כולל)

## אנליטיקה

- Google Analytics 4
- Hotjar (heatmaps)
- Plausible (privacy-first)
- אירועים מותאמים: `demo_requested`, `demo_extended`, `demo_to_paid`

</div>
