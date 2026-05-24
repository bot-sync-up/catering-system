# Secrets in AWS Secrets Manager / Doppler

You can use Vault, AWS Secrets Manager, or Doppler interchangeably for runtime secrets.
Pick **one** as the source of truth.

## AWS Secrets Manager

### Layout
```
/app/<env>/database/url
/app/<env>/redis/url
/app/<env>/jwt-signing            (JSON: { "current": "...", "previous": "..." })
/app/<env>/aes-key
/app/<env>/api-keys/<provider>
```

### Access (IRSA / OIDC)
1. Create an IAM OIDC provider for the cluster.
2. Create role `app-secrets` with policy:
   ```json
   { "Version":"2012-10-17","Statement":[
     {"Effect":"Allow","Action":["secretsmanager:GetSecretValue","secretsmanager:DescribeSecret"],
      "Resource":"arn:aws:secretsmanager:*:*:secret:/app/*"}]}
   ```
3. Annotate the ServiceAccount:
   ```yaml
   eks.amazonaws.com/role-arn: arn:aws:iam::<acct>:role/app-secrets
   ```
4. Inject with **External Secrets Operator**:
   ```yaml
   apiVersion: external-secrets.io/v1beta1
   kind: ExternalSecret
   metadata: { name: app-secrets }
   spec:
     refreshInterval: 1h
     secretStoreRef: { name: aws-sm, kind: ClusterSecretStore }
     target: { name: app-secrets, creationPolicy: Owner }
     data:
       - secretKey: DATABASE_URL
         remoteRef: { key: /app/production/database/url }
       - secretKey: JWT_SECRET
         remoteRef: { key: /app/production/jwt-signing, property: current }
   ```

### Rotation
- Use Secrets Manager **automatic rotation** with a Lambda for RDS credentials.
- For app-controlled keys (JWT, AES), schedule `rotation.sh` via EventBridge -> ECS task.

## Doppler

### Project + Configs
```
doppler projects create app
doppler configs create production --project app
doppler configs create staging    --project app
doppler configs create development --project app
```

### Mount in K8s
```bash
doppler secrets download --no-file --format docker > .env.doppler
kubectl -n production create secret generic app-secrets --from-env-file=.env.doppler --dry-run=client -o yaml | kubectl apply -f -
```
Better: install the **Doppler Kubernetes Operator** and use `DopplerSecret` CRDs — it auto-syncs.

### Local dev
```bash
doppler setup
doppler run -- npm run dev
```

## Choosing
| Need | Pick |
|---|---|
| Tight AWS integration, RDS managed rotation | AWS Secrets Manager |
| Multi-cloud, easy local dev UX | Doppler |
| Full PKI, dynamic DB creds, transit encryption | Vault |
