# Secrets — ניהול סודות

## עקרונות

1. **Vault הוא המקור היחיד.** אסור לשמור סודות ב-git, ב-.env מחוץ למפתח פיתוח, ב-CI vars לטווח ארוך, או ב-image layers.
2. **Least privilege.** כל שירות מקבל policy עם גישה רק למה שהוא צריך (ראה `vault-policies.hcl`).
3. **Rotation.** סודות קריטיים (JWT, DB password, webhook signing) מתחלפים אוטומטית כל 90 יום ע"י `rotation.sh`.
4. **Audit.** Vault audit log מועבר ל-Loki. כל קריאה לסוד prod נשמרת.

## מבנה המפתחות

```
secret/app/prod/
  ├── jwt-secret
  ├── session-secret
  ├── db-password
  ├── redis-password
  ├── stripe-secret
  ├── tranzila-credentials
  ├── twilio-token
  ├── sendgrid-api-key
  └── webhook-signing-key

secret/app/staging/  (same shape)
```

## נהלים

### הוספת סוד חדש
1. PR שמוסיף את שם המפתח ל-`vault-policies.hcl` תחת ה-policy הרלוונטי.
2. אחרי merge: `vault kv put secret/app/prod/<name> value=<...>`.
3. הפניה בקוד: דרך SDK של Vault, **לא** דרך `process.env`.

### Rotation ידנית
```bash
VAULT_ADDR=https://vault.example.co.il VAULT_TOKEN=<token> \
  ./rotation.sh prod
```

### Emergency revoke
```bash
vault token revoke -mode=path auth/token/create
vault kv put secret/app/prod/db-password value="$(openssl rand -base64 48)"
docker compose kill -s SIGTERM gateway worker
```

## CI

CI מקבל token עם `ci-write` policy בלבד — יכול לכתוב staging, **לא** prod.
Token ב-GitHub Actions Secret בשם `VAULT_TOKEN_CI`, TTL = 1h, מתחדש דרך AppRole.
