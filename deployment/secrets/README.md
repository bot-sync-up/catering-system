# ניהול Secrets

## עקרונות
- אסור secret בכתב פתוח ב-Git, ב-`.env`, או ב-ENV של GitHub Actions בתור plaintext.
- כל secret חי ב-secret store יחיד (Vault / AWS SM / Doppler / 1Password) - מקור אמת יחיד.
- אפליקציה מקבלת secrets רק בזמן הרצה, דרך:
  - Kubernetes: ExternalSecretsOperator -> Secret -> envFrom.
  - Docker Compose: Vault Agent sidecar שכותב ל-`/run/secrets/`.
  - CI/CD: OIDC -> Vault, ללא PAT סטטי.
- Rotation אוטומטי כל 90 יום ל-JWT/AES, יומי ל-DB credentials דינמיים.

## אפשרויות (בחר אחת)

### 1) HashiCorp Vault (מומלץ ל-self-host)
- `vault-config.hcl` - cluster 3-node Raft + KMS auto-unseal.
- `vault-policies.hcl` - מדיניות לפי תפקיד (platform-read, platform-rotate, ops-admin, ci-cd).
- Auth methods: Kubernetes Service Account, GitHub OIDC, OIDC for humans (Google Workspace).

### 2) AWS Secrets Manager
- מתאים אם אתם כבר ב-AWS.
- ExternalSecretsOperator עם `SecretStore` מסוג `aws`.
- Automatic rotation דרך Lambda template.

### 3) Doppler
- SaaS, חינמי לקטנים. Integration ישיר ל-Vercel/GitHub/k8s.
- מספק `doppler run --` wrapper.

### 4) 1Password (לאדמינים)
- 1Password Connect Server רץ ב-k8s.
- מתאים לסודות אנושיים (admin passwords, recovery keys), פחות לאפליקציה.

## אסור (Enforced ע"י gitleaks + pre-commit)
- `JWT_SECRET=...` ב-`.env` שמתחייב.
- `password` בקוד.
- token ב-comments.

## Rotation
```
tsx deployment/secrets/rotate-secrets.ts --key auth/jwt
tsx deployment/secrets/rotate-secrets.ts --key auth/aes
```
מערכת תייצר `previousKid` שאפליקציה משתמשת בו לאימות JWT ישנים עד תוקפם.

## On-call: שחרור secret חירום (break-glass)
1. כניסה ל-Vault עם MFA.
2. `vault token create -policy=ops-admin -ttl=1h`.
3. כל פעולה נרשמת ב-audit log.
4. ב-15 דקות הבאות הוצאת secrets רותציה אוטומטית.
