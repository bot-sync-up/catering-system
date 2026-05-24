# Load Tests (k6)

## Run
```
brew install k6      # or: docker run -i grafana/k6
k6 run -e BASE_URL=https://staging.example.com ordering-flow.js
```

## Thresholds (גלובלי)
| Metric | Threshold |
|---|---|
| p95 HTTP duration | < 500ms |
| p99 HTTP duration | < 1500ms |
| Error rate | < 1% |
| Place-order p95 | < 800ms |
| Payment confirm p95 | < 700ms |

## תרחישים
- `ordering-flow.js` - 30 RPS למשך 5 דק' + spike ל-200 RPS למשך 2 דק'.
- `payment-flow.js` - 20 VUs למשך 3 דק' מול sandbox של iCount/Cardcom.
- `ocr-upload.js` - 10 VUs (כבד) למשך 2 דק'.

## CI integration
```yaml
- uses: grafana/setup-k6-action@v1
- run: k6 run --out json=results.json deployment/load-tests/ordering-flow.js
  env: { BASE_URL: ${{ secrets.STAGING_URL }} }
- uses: actions/upload-artifact@v4
  with: { name: k6-results, path: results.json }
```

## הקפדות
- אסור להריץ נגד production ללא תיאום (rate cap).
- השתמש ב-`x-test-mode: 1` כדי שה-payment provider יקבל sandbox.
- Cleanup: BullMQ job `loadtest:cleanup` מוחק orders עם `metadata.k6=true` אחרי שעה.
