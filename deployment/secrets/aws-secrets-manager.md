# AWS Secrets Manager - Setup

## 1. Secrets layout
```
/prod/platform/db        -> { url, user, password }
/prod/platform/redis     -> { url, password }
/prod/platform/auth      -> { jwt, refresh, aes, nextauth }
/prod/platform/payments  -> { icount_token, cardcom_terminal, cardcom_user, cardcom_pass }
/prod/platform/storage   -> { s3_access, s3_secret }
/prod/platform/obs       -> { sentry_dsn, sentry_auth }
/prod/platform/whatsapp  -> { token, phone_id }
```

## 2. IRSA (IAM Role for Service Account)
```
eksctl create iamserviceaccount \
  --name external-secrets \
  --namespace external-secrets \
  --cluster prod \
  --attach-policy-arn arn:aws:iam::ACC:policy/ExternalSecretsAccess \
  --approve
```

## 3. ClusterSecretStore
```yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata: { name: aws-secrets }
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef: { name: external-secrets, namespace: external-secrets }
```

## 4. Rotation (Lambda)
- שימוש ב-`AWSSecretsManagerRotationMultiUser` template ל-Postgres.
- ל-JWT/AES: Lambda custom שמייצר key חדש ושומר versions=2 (current + previous).

## 5. עלות
~ $0.40 / secret / month + $0.05 / 10k API calls. ל-15 secrets צפי ~$10/חודש.
