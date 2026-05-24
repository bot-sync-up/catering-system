# חבילת Performance Benchmarking + Optimization

חבילה מאוחדת לבדיקות עומס, פרופיילינג, אופטימיזציית DB/Cache/Frontend, וזיהוי רגרסיות ב-CI.

## מבנה התיקייה

```
performance/
├── scripts/                    בדיקות k6 + script השוואה
│   ├── ordering-baseline.js    0→100 VUs, p95<500ms, error<1%
│   ├── ordering-spike.js       spike ל-500 VUs
│   ├── payment-flow.js         Cardcom ב-50 RPS
│   ├── ocr-upload.js           multipart + polling, p95<15s
│   ├── event-creation.js       חתונה 700+ מוזמנים
│   ├── portal-browse.js        דפדוף משתמש
│   └── compare-to-baseline.js  ניתוח רגרסיות ל-CI
├── common/
│   ├── auth.js                 login + token cache
│   └── data.js                 מחוללי דאטה בעברית
├── profilers/
│   ├── postgres-slow-queries.sql
│   ├── redis-slowlog.sh
│   ├── node-cpu-profile.md
│   └── nextjs-bundle-analyzer.config.js
├── optimization/
│   ├── db-indexes-audit.sql
│   ├── connection-pool-tuning.md   (PgBouncer)
│   └── partitioning-strategy.md    (audit_log, orders, payments)
├── caching/
│   ├── redis-strategy.md       cache-aside + SWR + single-flight
│   ├── cdn-rules.md
│   └── nextjs-revalidate.md    ISR
├── frontend/
│   ├── core-web-vitals-checklist.md
│   ├── next-image-optimization.md
│   └── code-splitting.md
├── reports/
│   ├── baseline-results.md     תבנית למילוי
│   └── optimization-wins.md    היסטוריית שיפורים
├── .github/workflows/
│   └── performance-regression.yml  cron יומי + alert
└── thresholds.json             SLO references
```

## דרישות מוקדמות

```bash
# התקנת k6 (Linux/Mac)
brew install k6
# או
sudo apt-get install k6

# Windows
choco install k6

# התקנת clinic (פרופיילר Node)
npm i -g clinic autocannon

# התקנת redis-cli (לפרופיילר)
sudo apt-get install redis-tools
```

## משתני סביבה

הגדר בקובץ `.env` (לא לקומיט):

```env
BASE_URL=https://staging.syncup.co.il
TEST_PASSWORD=LoadTest123!
CARDCOM_SANDBOX=1
REDIS_URL=redis://localhost:6379
```

## הרצת בדיקות

### Baseline בודד

```bash
k6 run performance/scripts/ordering-baseline.js
```

### עם משתני סביבה מותאמים

```bash
BASE_URL=https://prod.syncup.co.il \
TEST_PASSWORD=$PERF_PASS \
k6 run performance/scripts/ordering-baseline.js
```

### יצוא תוצאות ל-JSON

```bash
k6 run \
  --summary-export=performance/reports/baseline-$(date +%Y%m%d).json \
  --out json=performance/reports/baseline-raw-$(date +%Y%m%d).json \
  performance/scripts/ordering-baseline.js
```

### ריצה מקבילה של כל הבדיקות

```bash
for s in ordering-baseline portal-browse event-creation; do
  k6 run --summary-export=performance/reports/$s.json \
    performance/scripts/$s.js &
done
wait
```

## איך לקרוא תוצאות k6

הפלט הסטנדרטי מציג:

```
http_req_duration..............: avg=42.1ms min=8ms med=35ms max=890ms p(90)=89ms p(95)=120ms p(99)=380ms
http_req_failed................: 0.08%  ✓ 12 ✗ 14988
checks.........................: 99.84% ✓ 7449 ✗ 12
```

**להסתכל קודם על:**
1. `http_req_failed` — חייב < 1%. אם יותר = יש שגיאות. בדוק `--out json` לפי קוד.
2. `http_req_duration p(95)` — היעד פר-script (ordering: 500ms, OCR: 15s).
3. `iteration_duration` — חישבן זמן מחזור משתמש מלא.
4. `checks` — אחוז ה-assertions שעברו. חייב > 99%.

## תיקון רגרסיות

כש-CI מסמן רגרסיה (issue אוטומטי נפתח עם תווית `performance` + `regression`):

### שלב 1 - הבן איזה מטריק נופל

ראה את ה-summary.md בעמוד ה-issue. דוגמה:

```
| Script           | Metric    | Current | Baseline | Diff   |
| ordering-baseline| p95       | 720ms   | 420ms    | +71.4% |
```

71.4% רגרסיה ב-p95. נקודת התחלה - מה השתנה ב-PRs האחרונים.

### שלב 2 - הרץ פרופיילר תחת אותו עומס

```bash
# טרמינל 1 - הרץ אפליקציה עם clinic
clinic doctor --on-port 'sleep 1200' -- node server.js

# טרמינל 2 - תקפת את k6 רק על ה-script שנפל
k6 run performance/scripts/ordering-baseline.js
```

נסגור את ה-clinic אחרי שהבדיקה תסתיים. ייפתח HTML עם:
- event loop lag timeline
- CPU usage
- I/O wait
- GC pressure

### שלב 3 - בדוק DB אם הקריאה הראתה I/O wait גבוה

```bash
psql -f performance/profilers/postgres-slow-queries.sql > slow.txt
```

חפש שאילתות חדשות במצב mean_exec_time גבוה - בדרך כלל זה PR שהוסיף JOIN בלי אינדקס.

תיקון מהיר - הוסף אינדקס מ-`optimization/db-indexes-audit.sql`.

### שלב 4 - בדוק Redis

```bash
./performance/profilers/redis-slowlog.sh staging-redis.internal 6379 $REDIS_PASS
```

חפש פקודות `KEYS *` (אסור!) או `MGET` עם רשימות ענקיות.

### שלב 5 - אחרי תיקון

הרץ את ה-script הספציפי שוב שתאמת תיקון:

```bash
k6 run performance/scripts/ordering-baseline.js
```

אם p95 חזר לסביבת ה-baseline - merge. CI יעדכן את ה-baseline אוטומטית ב-main.

## תרחיש שגרתי

| שלב | תדירות | מה |
|-----|--------|----|
| baseline run | יומי 04:00 | CI מריץ את כל הסקריפטים מול staging |
| השוואה | אוטומטית | רגרסיה > 10% פותחת issue |
| pre-deploy | פר-release | הרץ ordering-spike ידנית לפני production deploy |
| postgres analyze | חודשי | הרץ db-indexes-audit.sql, מחק unused, הוסף missing |
| redis snapshot | שבועי | redis-slowlog.sh + עדכן `optimization-wins.md` |
| bundle analyzer | פר-PR שמשנה UI | `ANALYZE=true npm run build` |
| Lighthouse | פר-PR | ב-CI |

## SLO

כל הספים מאוחדים ב-`thresholds.json`. עדכן שם, ולא בכל script.

## פרק אחריות

- כל פיתוח חדש: ודא שאתה לא חוצה את ה-thresholds לפני merge.
- אם רגרסיה הוקפאה בכוונה (שיפור עתידי תלוי בה), הוסף תיעוד ב-`reports/optimization-wins.md` תחת "Known regressions".
- אל תדלג על CI עם `[skip ci]` ב-PRs שמשנים API hot path.
