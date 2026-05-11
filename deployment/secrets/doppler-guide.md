# Doppler — Quick Setup

## 1. Project structure
- Project: `platform`
- Configs: `dev`, `staging`, `prd`
- Service tokens: per-app read-only

## 2. Local dev
```
doppler login
doppler setup -p platform -c dev
doppler run -- pnpm dev
```

## 3. GitHub Actions
```yaml
- uses: dopplerhq/cli-action@v3
- run: doppler run -- pnpm test
  env:
    DOPPLER_TOKEN: ${{ secrets.DOPPLER_TOKEN }}
```

## 4. Kubernetes
Install `doppler-kubernetes-operator`, then:
```yaml
apiVersion: secrets.doppler.com/v1alpha1
kind: DopplerSecret
metadata: { name: platform-secrets }
spec:
  tokenSecret: { name: doppler-token-prd }
  managedSecret:
    name: platform-secrets
    type: Opaque
  resyncSeconds: 60
```

## 5. Rotation
Doppler UI -> Secrets -> "Rotate". Webhook ל-Slack על כל rotation.
