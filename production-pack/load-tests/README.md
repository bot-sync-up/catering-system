# Load tests (k6)

## Targets
- **p95 < 500 ms** on hot endpoints.
- **Error rate < 1%** for all scenarios.

## Run against staging
```bash
k6 run -e BASE_URL=https://staging.example.com -e API_TOKEN=<token> ordering.js
k6 run -e BASE_URL=https://staging.example.com -e API_TOKEN=<token> payment.js
k6 run -e BASE_URL=https://staging.example.com -e API_TOKEN=<token> -e OCR_PDF_PATH=./sample.pdf ocr.js
```

## CI integration (optional)
Add as a manual workflow that targets staging; never run against prod without a maintenance window.

## What good output looks like
```
http_req_duration..............: p(95)=412ms  p(99)=920ms
http_req_failed................: 0.34%
errors.........................: 0.34%
```

A red `http_req_duration` or `errors` row fails the run (exit code 99).
