# services/ — שירותי backend עצמאיים

שירותים שאינם Next.js apps — לדוגמה Gateway, Workers ברקע, cron.

```
services/
├── gateway/    # @catering/service-gateway — API Gateway / Reverse proxy מאוחד
└── worker/     # @catering/service-worker  — BullMQ worker (OCR, BI, emails, reports)
```

## מקור

- `services/gateway` — נגזר מ-01 `agent-ac2389dbcde5e8bd9` (תשתית) + `nginx.conf`.
- `services/worker` — מאוחד מתורים שהיו ב-12 OCR, 22 BI, 23 Marketing.
