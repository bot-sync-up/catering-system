# Migration Rollback Strategy

## Golden rule: deploys must be reversible without data loss.

Most production incidents from migrations come from **destructive** changes (DROP TABLE/COLUMN, NOT NULL on existing rows, type narrowing). We avoid them with a four-step pattern.

## The expand-and-contract pattern

For every schema change that is not purely additive, split into **two** deploys:

1. **Expand** (forward-compatible)
   - Add the new column / table / index.
   - App reads from both old and new; writes go to both.
2. **Backfill** (out-of-band)
   - Background job copies old -> new in batches with `WHERE ... AND NOT EXISTS` to be idempotent.
   - Verify counts match.
3. **Switch reads** (still reversible)
   - App reads only from new. Old column remains.
4. **Contract** (a separate, later release)
   - Drop the old column / table. Requires `safe: confirmed-via-RFC-####` comment in migration.

## Rollback decision tree

| Stage | Forward fix | Rollback action |
|---|---|---|
| Expand failed | Re-run migration; transactional, no data harm | Revert deploy |
| Backfill failed | Restart job — it is idempotent | None needed; old path still works |
| Switch reads failed | Roll deploy back, keep schema | Helm rollback; data is intact |
| Contract failed (rare) | Restore dropped column from latest dump, replay diff from WAL | `restore.sh pitr <key> "<switch-time>"` |

## App rollback (Helm)

```bash
helm history app -n production
helm rollback app <revision> -n production --wait --timeout 10m
```

The chart includes deployment annotations `checksum/config` and `checksum/secret` so a rollback that flips back env-vars actually restarts pods.

## DB rollback

- **Within 1 minute of deploy**: forward-fix migration is almost always safer than running `down.sql`.
- **Significant data drift**: `restore.sh pitr <key> "<deploy_time - 30s>"` against a standby, validate, then fail over.
- **Logical drift only**: write a corrective migration; never roll the schema back through `down.sql` in production.

## Emergency: kill a deploy mid-rollout

```bash
kubectl -n production rollout pause deploy/app-next
kubectl -n production rollout pause deploy/app-gateway
kubectl -n production rollout pause deploy/app-worker
# investigate, then either resume or rollback.
helm rollback app -n production
```
