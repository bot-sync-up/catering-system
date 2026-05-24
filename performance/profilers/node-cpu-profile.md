# פרופיילינג CPU של Node.js

מדריך מעשי לאיתור צוואר בקבוק CPU ו-event loop lag באפליקציית Node/Next.

## מטרות

- לאתר פונקציות שצורכות הכי הרבה CPU תחת עומס.
- למדוד event loop lag — מעל 50ms זה דגל אדום.
- לזהות memory leaks שגורמים ל-GC לרוץ הרבה.

## אופציה 1 - clinic.js (המומלץ)

```bash
npm i -g clinic autocannon

# Flame graph - איזה פונקציות מבזבזות CPU
clinic flame --on-port 'autocannon -d 60 -c 50 http://localhost:3000/api/orders' -- node server.js

# Bubbleprof - איפה ה-async תקוע
clinic bubbleprof --on-port 'autocannon -d 60 -c 50 http://localhost:3000/' -- node server.js

# Doctor - אבחנה כללית (event loop, GC, I/O)
clinic doctor --on-port 'autocannon -d 60 -c 50 http://localhost:3000/' -- node server.js
```

הפלט נפתח בדפדפן כ-HTML אינטראקטיבי.

## אופציה 2 - 0x flame graph בלי clinic

```bash
npm i -g 0x
0x -- node server.js
# רוץ עומס בטרמינל אחר
# Ctrl+C כדי לסיים -> נפתח flame graph
```

## אופציה 3 - Chrome DevTools (production-safe)

```bash
# הפעל עם inspector
node --inspect=0.0.0.0:9229 server.js
```

חבר את `chrome://inspect`, לחץ Inspect, ולשונית Performance -> Record.

## אופציה 4 - מובנה ב-Node 

```bash
# CPU profile
node --cpu-prof --cpu-prof-dir=./profiles server.js
# .cpuprofile נטען ל-DevTools

# Heap snapshot
node --heap-prof --heap-prof-dir=./profiles server.js
```

## ניטור event loop lag בייצור

הוסף ל-`server.js`:

```js
import { monitorEventLoopDelay } from 'node:perf_hooks';

const h = monitorEventLoopDelay({ resolution: 20 });
h.enable();

setInterval(() => {
  // p99 lag במילישניות
  const p99ms = h.percentile(99) / 1e6;
  if (p99ms > 50) {
    console.warn(`[perf] event loop p99 lag: ${p99ms.toFixed(1)}ms`);
  }
  h.reset();
}, 10_000);
```

או חבר ל-Prometheus עם `prom-client`:

```js
import { collectDefaultMetrics, register } from 'prom-client';
collectDefaultMetrics({ eventLoopMonitoringPrecision: 20 });
```

## מה לחפש ב-flame graph

| תופעה | סימן | תיקון |
|------|------|------|
| מגדל JSON.parse/stringify רחב | סריאליזציה כבדה | streaming או fast-json-stringify |
| `compileFunction`, `transform-sync` | קומפילציה חוזרת בזמן ריצה | להעביר ל-build time |
| `bcrypt.hashSync` | חסימה סינכרונית | להעביר ל-async או לעבוד עם worker |
| `Buffer.from`/regex רחב | parsing בכל request | cache או pre-compile |
| המון `_tickCallback` בלי הקשר | יותר מדי promises רדודים | concat או batching |

## ספי אזהרה

- CPU > 75% במשך > 30s = scale-out נדרש או יש hot loop.
- Event loop lag p99 > 50ms = העברה ל-worker_threads או הפחתת sync work.
- GC pause > 100ms = bloat בזיכרון, בדוק heap snapshot.
- RSS עולה מונוטונית = leak. השווה שני snapshots ב-DevTools.

## אינטגרציה ל-k6

הרץ את הפרופיילר במקביל ל-k6:

```bash
# טרמינל 1
clinic doctor --on-port 'sleep 1200' -- node server.js
# טרמינל 2 - 20 דקות עומס
k6 run performance/scripts/ordering-baseline.js
```
