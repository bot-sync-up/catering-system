<div dir="rtl" lang="he">

# צ'ק-ליסט טרום השקה לייצור

לפני שאתם לוחצים "Deploy to prod" בפעם הראשונה — עברו על כל הסעיפים. אל תדלגו על אף אחד.

## תשתית (Infrastructure)
- [ ] **DNS** — רשומות A/AAAA מצביעות ל-LB; TTL ≤ 300s לקראת השקה (אפשר לעלות אחרי שבוע יציב).
- [ ] **תעודות SSL** — Let's Encrypt + cert-manager עובדים; renewal נבדק (`cert-manager.io/cluster-issuer`).
- [ ] **CDN** — Cloudflare/Fastly מוגדר; כללי cache נבדקו (ראו `performance/cdn-config.md`).
- [ ] **WAF** — OWASP rules מופעלים ב-medium; whitelist למוניטורינג ול-Googlebot.
- [ ] **DDoS protection** — מופעל ברמת ה-CDN.
- [ ] **Kubernetes cluster** — 3 nodes לפחות, פרוסים בכמה AZ.
- [ ] **HPA** — נבדק שמתרחב תחת עומס (k6 spike).
- [ ] **PDB** — `minAvailable: 2` מוגדר; node drain לא מפיל את האפליקציה.
- [ ] **ServiceMonitor** — Prometheus קולט מטריקות מכל ה-pods.

## אבטחה (Security)
- [ ] **סודות** — אף סוד לא ב-git (אומת ע"י gitleaks ב-CI).
- [ ] **Vault / Secrets Manager** — מאוכלס; rotation מתוזמן (ראו `secrets/rotation.sh`).
- [ ] **TLS** — `ssl_protocols TLSv1.2 TLSv1.3` בלבד; A+ ב-SSL Labs.
- [ ] **HSTS** — `max-age=63072000; includeSubDomains; preload`; submission ל-Chrome preload.
- [ ] **CSP** — `Content-Security-Policy` מוגדר; אין `unsafe-eval` בייצור (אלא אם מוצדק).
- [ ] **Security headers** — X-Frame, X-Content-Type, Referrer-Policy, Permissions-Policy.
- [ ] **JWT** — secret באורך 64+ תווים; אלגוריתם RS256 או HS512; expiration ≤ 1 שעה; refresh token.
- [ ] **AES key** — 32 בתים, מאוחסן ב-Vault, מסוגל לרוטציה (ראו `rotation.sh aes`).
- [ ] **rate limiting** — endpoint-ים רגישים (login/register/otp) ב-5r/m; שאר ה-API ב-20r/s.
- [ ] **CAPTCHA / hCaptcha** — על login / register / forgot-password.
- [ ] **CORS** — `CORS_ORIGINS` רשימה לבנה מדויקת, לא `*`.
- [ ] **CSRF** — מוגן על mutations שאינן Bearer auth.
- [ ] **trivy** ו-**npm audit** — אפס ממצאי high/critical (מוגדר ב-`security-scan.yml`).
- [ ] **CodeQL** — לא נשארו אזהרות פתוחות בקוד הרגיש.
- [ ] **gitleaks** — היסטוריה נקייה (`git filter-repo` אם צריך).
- [ ] **2FA** — חובה לכל החשבונות עם הרשאות לייצור (GitHub, Cloudflare, AWS, Vault, DB admin).
- [ ] **least-privilege IAM** — אף role לא רחב מהדרוש; reviewed.

## נתונים (Data)
- [ ] **בקאפ Postgres** — רץ יומית, מוצפן (age), נשלח ל-R2/S3.
- [ ] **בקאפ Redis** — RDB יומי.
- [ ] **WAL archiving** — מופעל לצורך PITR; נבדק שמגיע ל-S3.
- [ ] **שחזור מבחן** — `verify.sh` רץ פעם בשבוע ועובר.
- [ ] **שחזור full drill** — בוצע פעם אחת מקצה לקצה; זמן השחזור < 30 דקות.
- [ ] **Retention** — 30 ימים יומיים + 12 חודשים חודשיים + 7 שנים שנתיים.
- [ ] **PII** — שדות רגישים (ת.ז., כרטיסי אשראי, כתובות) מוצפנים at-rest ב-AES; אין הצפנה ב-app aside מ-transit אחרי TLS.
- [ ] **GDPR / חוק הגנת הפרטיות (תיקון 13)** — מדיניות פרטיות זמינה; אפשרות מחיקה ("הזכות להישכח") מיושמת.
- [ ] **לוגים** — אין PII מודפס בלוגים; redaction אוטומטי לדפוסי ת.ז./כ.אשראי.

## ביצועים (Performance)
- [ ] **Lighthouse** — Performance ≥ 85 על דף הבית במובייל.
- [ ] **CLS** — < 0.1; LCP < 2.5s; INP < 200ms.
- [ ] **next/image** — כל התמונות עברו את `next-image-checklist.md`.
- [ ] **Bundle size** — `next build` מציג < 250KB JS לדף הבית.
- [ ] **gzip / brotli** — מופעל ב-nginx.
- [ ] **DB indexes** — `db-indexes-audit.sql` רץ; אין seq-scans כבדים.
- [ ] **N+1 queries** — נסרק בעזרת query log או Sentry performance.
- [ ] **Redis cache hit ratio** — > 90% על endpoint-ים read-heavy.
- [ ] **k6 ordering** — p95 < 500ms תחת 500 VU, error < 1%.
- [ ] **k6 payment** — p95 < 800ms ב-100 req/s.

## תצפיתיות (Observability)
- [ ] **Prometheus** — scrape כל הקומפוננטות; 30 ימי retention.
- [ ] **Grafana** — 3 דשבורדים provisioned (system / business / errors).
- [ ] **Loki** — קולט לוגי docker; 30 ימי retention.
- [ ] **Alerts** — כולם מחוברים ל-PagerDuty/Slack ונבדקו עם `amtool alert add`.
- [ ] **Sentry** — DSN מוגדר; sourcemaps מועלים; release tags לפי SHA.
- [ ] **APM (OpenTelemetry)** — traces זורמים מ-next + gateway + worker.
- [ ] **Status page** — public/private סטטוס פייג' מוכן (Statuspage / Cachet).
- [ ] **Uptime monitoring** — Blackbox external (UptimeRobot, Better Uptime) מודד מבחוץ.

## תפעול (Operations)
- [ ] **CI ירוק** — lint + test + build על `main` (`ci.yml`).
- [ ] **Deploy staging אוטומטי** — מ-`main` (`deploy-staging.yml`).
- [ ] **Deploy prod ידני** — דרושה approval (`deploy-prod.yml`).
- [ ] **Blue/Green** — נבדק שעובד ב-staging.
- [ ] **Canary** — 10% traffic עובד; metrics נקיים לאחר 5 דקות.
- [ ] **Pre-deploy check** — `migrations/pre-deploy-check.sh` תופס מיגרציות מסוכנות.
- [ ] **Rollback** — תורגל ידנית (`helm rollback`); זמן < 5 דקות.
- [ ] **maintenance mode** — feature flag קיים; ניתן להפעלה בקליק.
- [ ] **runbook** — `RUNBOOK.md` נקרא ע"י כל מי שעל-קריאה.

## עסקים / משפט (Business / Legal)
- [ ] **תקנון** — Terms of Service בעברית, אושר ע"י עו"ד.
- [ ] **מדיניות פרטיות** — תואמת תיקון 13 לחוק הגנת הפרטיות; קישור ב-footer.
- [ ] **Cookie banner** — לקוקיז שאינם הכרחיים (analytics / marketing).
- [ ] **חשבונית מס** — נפיק חשבוניות מס כדין; מספרי חשבונית עוקבים; חתימה דיגיטלית אם דרוש.
- [ ] **תשלומים** — PCI-DSS scope מצומצם (Stripe Elements / Tranzila iframe — לא שומרים PAN).
- [ ] **support email** — ענוי; SLA תגובה תוך 24 שעות.

## תהליכים אנושיים (People)
- [ ] **on-call schedule** — מוגדר ב-PagerDuty לחודש קדימה.
- [ ] **escalation policy** — primary → secondary → manager תוך 15 דקות.
- [ ] **incident channel** — `#incident-active` קיים, mute disabled לתורנים.
- [ ] **runbook drill** — תרגול תקרית פיקטיבית בוצע השבוע.
- [ ] **access review** — מי יש לו prod access? רשימה תועדה ונחתמה.
- [ ] **offboarding checklist** — נכתב, כולל ביטול MFA / SSH / VPN / Vault.

---

> סך הכל: **75+ פריטים**. כל ✗ פתוח לפני launch = סיבה לעצור.

</div>
