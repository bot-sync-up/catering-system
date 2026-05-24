# אסטרטגיית Rollback

## עקרון: שני סוגי שינויים
1. **Backward-compatible** (הוספת עמודה nullable, אינדקס, טבלה חדשה) - rollback ע"י deploy של תמונה קודמת. ה-DB לא נוגעים.
2. **Breaking** (drop column, rename, type change) - חייב להיות מפוצל ל-3 deploys (Expand -> Migrate -> Contract).

## תהליך Expand/Contract

### Phase 1 - Expand (PR #N)
- מוסיפים עמודה/טבלה חדשה.
- הקוד החדש כותב לשני המקומות (dual write).
- ה-deploy לא מוחק כלום.

### Phase 2 - Migrate
- backfill ע"י BullMQ job.
- וידוא שכל הקריאות עברו לעמודה החדשה.

### Phase 3 - Contract (PR #N+1, רק אחרי שבוע)
- מוחקים את העמודה הישנה.
- כאן rollback = restore from backup; אין דרך לחזור אחורה בלי data loss אם לא תוכנן.

## Rollback מיידי (חירום)

```bash
# 1. שליפת הגרסה הקודמת
PREV_TAG=$(helm history platform -n production | tail -n2 | head -n1 | awk '{print $1}')
helm rollback platform "$PREV_TAG" -n production --wait

# 2. ב-DB:
# Backward-compat: לא נדרש דבר.
# Breaking שלא דרך Expand/Contract: restore מהבאקאפ:
bash deployment/backups/restore.sh \
  --backup s3://bucket/prod/daily/PRE-DEPLOY-$SHA.sql.zst.age \
  --target-db appdb_rollback
# DNS swap (Cloudflare API) -> משתמשים פוגעים בעותק החדש
```

## Verification אחרי Rollback
1. `/api/health` של כל אפליקציה החזיר 200.
2. Synthetic checkout (k6 smoke) עבר.
3. error rate חזר ל-< 0.5% ב-Grafana.
4. announce ב-Slack + עדכון status page.
