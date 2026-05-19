# דוח Baseline - ביצועי מערכת

> תבנית למילוי אחרי ריצת הסקריפטים. שמור עותק פר-תאריך תחת `reports/archive/`.

| שדה | ערך |
|-----|-----|
| תאריך הרצה | YYYY-MM-DD HH:MM |
| גרסה | git SHA |
| סביבה | staging / production |
| מבצע | שם |
| הפעלה מקבילה | כן/לא |

---

## תקציר מנהלים

| מדד | יעד | תוצאה | פער | פעולה |
|-----|-----|--------|-----|--------|
| ordering p95 | 500ms | __ms | __% | |
| ordering error rate | <1% | __% | | |
| payment p95 | 2000ms | __ms | | |
| OCR e2e p95 | 15s | __s | | |
| portal LCP | 2.5s | __s | | |
| event creation p95 | 1.5s | __s | | |

---

## פירוט פר-בדיקה

### 1. Ordering Baseline (`scripts/ordering-baseline.js`)

**הגדרה:** 0→100 VUs over 5min, hold 10min, ramp down 5min.

| מדד | ערך |
|-----|-----|
| Total iterations | __ |
| Orders created | __ |
| http_req_duration avg | __ms |
| http_req_duration p50 | __ms |
| http_req_duration p95 | __ms |
| http_req_duration p99 | __ms |
| http_req_failed rate | __% |
| Checks passed | __% |

**ממצאים:**
- (נקודה ראשונה)
- (נקודה שנייה)

**צוואר בקבוק שאותר:**
- (תיאור + לינק ל-flame graph / EXPLAIN)

---

### 2. Spike Test (`scripts/ordering-spike.js`)

**הגדרה:** 10→500 RPS spike, hold 2min.

| מדד | ערך |
|-----|-----|
| Peak RPS achieved | __ |
| Errors during spike | __% |
| Recovery time | __s |
| p95 latency at peak | __ms |

**תצפיות:**
- האם auto-scaling הספיק?
- כמה זמן עד RESTORE לאחר ירידה?

---

### 3. Payment Flow (`scripts/payment-flow.js`)

| מדד | ערך |
|-----|-----|
| Constant RPS | 50 |
| Total payments processed | __ |
| Successful | __ |
| Failed | __ |
| cardcom_tokenize_ms p95 | __ms |
| cardcom_charge_ms p95 | __ms |
| timeout rate | __% |

**שגיאות נפוצות:**
- (קוד / סיבה / כמות)

---

### 4. OCR Upload (`scripts/ocr-upload.js`)

| מדד | ערך |
|-----|-----|
| Total uploads | __ |
| ocr_upload_ms p95 | __ms |
| ocr_e2e_ms p95 | __s |
| ocr_timeout_rate | __% |

**ניתוח queue:**
- אורך תור ממוצע
- worker utilization

---

### 5. Event Creation (`scripts/event-creation.js`)

| מדד | ערך |
|-----|-----|
| Events created | __ |
| Avg guests per event | __ |
| event_create_ms p95 | __ms |
| guests_bulk_ms p95 | __ms |
| admin_add_ms p95 | __ms |
| Total invites sent | __ |

---

### 6. Portal Browse (`scripts/portal-browse.js`)

| מדד | ערך |
|-----|-----|
| Total page loads | __ |
| portal_page_load_ms p95 | __ms |
| CDN hit ratio | __% |
| Anonymous vs authenticated | __% / __% |

---

## תשתית - מצב במהלך הבדיקה

### Postgres

| מדד | מקסימום | ממוצע |
|-----|---------|--------|
| Active connections | __ | __ |
| Cache hit ratio | __% | __% |
| Slowest query (mean ms) | __ | |
| CPU % | __% | |

**שאילתות איטיות (top 5):**
1. (snippet) - __ms avg, __ calls
2. ...

### Redis

| מדד | ערך |
|-----|-----|
| Memory used | __MB |
| Evicted keys | __ |
| Slowlog entries > 10ms | __ |
| Hit ratio (חישוב מאפליקציה) | __% |

### Node app

| מדד | ערך |
|-----|-----|
| CPU avg | __% |
| CPU peak | __% |
| RSS peak | __MB |
| Event loop p99 lag | __ms |
| GC pauses > 100ms | __ |

---

## פעולות

| # | פעולה | בעלים | יעד | סטטוס |
|---|------|------|------|--------|
| 1 | | | | |
| 2 | | | | |

---

## נספחים

- קובץ k6 JSON: `reports/last-baseline-summary.json`
- Postgres pg_stat_statements snapshot: `reports/pg-YYYYMMDD.csv`
- Redis profile: `reports/redis-YYYYMMDD/`
- Clinic flame: `reports/flame-YYYYMMDD.html`
