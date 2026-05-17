# Backups

## Retention
- **daily**: 30 most recent dumps
- **monthly**: first-of-month dumps for 12 months
- **yearly**: first-of-year dumps for 7 years

## Encryption
Backups use [age](https://age-encryption.org/) with a single recipient public key (`BACKUP_AGE_RECIPIENT`).
The matching identity file (`BACKUP_AGE_IDENTITY`) lives only in Vault and the operator's offline backup.

## Scheduling
Run as cron or Kubernetes CronJob:

```cron
0 2  * * *  backup-postgres.sh
30 2 * * *  backup-redis.sh
0 4  * * 0  verify.sh           # Sunday 04:00 — weekly restore drill
```

## WAL archiving for PITR
Postgres in `docker-compose.prod.yml` is started with
`archive_mode=on, archive_command='cp %p /var/lib/postgresql/wal/%f'`.
Run a sidecar to ship `/var/lib/postgresql/wal/*` to `s3://<bucket>/postgres/wal/`
every minute (see `wal-shipper` in compose if you add it).

## Restore drill checklist
1. `restore.sh full <key>` against a staging server.
2. Smoke-test the app against the restored DB.
3. Record the elapsed time in the runbook (target RTO < 30 min, RPO < 5 min with WAL).
