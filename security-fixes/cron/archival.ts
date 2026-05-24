/**
 * Archival Cron — שימור 7 שנים ב-cold storage
 * ---------------------------------------------------------------
 * רץ פעם בשבוע. רשומות שגילן > 12 חודשים מועברות ל-Cloudflare R2,
 * עם דחיסה (gzip) ו-checksum. אחרי 7 שנים — הרשומות נמחקות לחלוטין.
 *
 * שימוש:
 *   $ tsx cron/archival.ts            # מצב אמיתי
 *   $ tsx cron/archival.ts --dry-run  # סימולציה בלבד
 *
 * משתני סביבה נדרשים:
 *   - R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
 *   - DATABASE_URL
 *   - ARCHIVAL_BATCH_SIZE (ברירת מחדל 1000)
 *
 * תזמון מומלץ ב-crontab (פעם בשבוע ב-04:00 בלילה ראשון):
 *   0 4 * * 0 /usr/bin/env tsx /app/cron/archival.ts >> /var/log/archival.log 2>&1
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);

/* ----------------------------------------------------------- */
/* תצורה                                                         */
/* ----------------------------------------------------------- */
const COLD_AGE_DAYS = 365;        // מעבר ל-cold אחרי שנה
const DELETE_AGE_DAYS = 365 * 7;  // מחיקה אחרי 7 שנים
const BATCH = parseInt(process.env.ARCHIVAL_BATCH_SIZE ?? '1000', 10);
const DRY = process.argv.includes('--dry-run');

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
  },
});

/* ----------------------------------------------------------- */
/* טיפוסים גנריים — להחליף ב-Prisma אמיתי                       */
/* ----------------------------------------------------------- */
interface ArchivableTable<T> {
  name: string;
  fetchOlderThan: (days: number, take: number) => Promise<T[]>;
  markArchived: (ids: string[]) => Promise<void>;
  hardDeleteOlderThan: (days: number) => Promise<number>;
  getId: (row: T) => string;
}

/* ----------------------------------------------------------- */
/* פונקציה ראשית                                                */
/* ----------------------------------------------------------- */
export async function runArchival(tables: ArchivableTable<unknown>[]): Promise<void> {
  console.log(`[ARCHIVAL] started ${new Date().toISOString()} dryRun=${DRY}`);

  for (const t of tables) {
    let totalArchived = 0;
    // לולאת ארכוב בלוטים
    while (true) {
      const rows = await t.fetchOlderThan(COLD_AGE_DAYS, BATCH);
      if (rows.length === 0) break;

      const payload = JSON.stringify(rows);
      const checksum = crypto.createHash('sha256').update(payload).digest('hex');
      const buf = await gzip(Buffer.from(payload, 'utf8'));
      const key = `archive/${t.name}/${new Date().toISOString().slice(0, 10)}/${checksum}.json.gz`;

      if (!DRY) {
        await r2.send(
          new PutObjectCommand({
            Bucket: process.env.R2_BUCKET,
            Key: key,
            Body: buf,
            ContentType: 'application/gzip',
            Metadata: { sha256: checksum, count: String(rows.length) },
          }),
        );
        await t.markArchived(rows.map(t.getId));
      } else {
        console.log(`[DRY] would archive ${rows.length} rows from ${t.name} -> ${key}`);
      }

      totalArchived += rows.length;
      if (rows.length < BATCH) break;
    }
    console.log(`[ARCHIVAL] ${t.name}: archived ${totalArchived} rows`);

    // מחיקה קשיחה אחרי 7 שנים
    if (!DRY) {
      const deleted = await t.hardDeleteOlderThan(DELETE_AGE_DAYS);
      console.log(`[ARCHIVAL] ${t.name}: hard-deleted ${deleted} rows (>${DELETE_AGE_DAYS}d)`);
    }
  }

  console.log(`[ARCHIVAL] finished ${new Date().toISOString()}`);
}

/* ----------------------------------------------------------- */
/* CLI entry                                                     */
/* ----------------------------------------------------------- */
if (require.main === module) {
  /*
   * דוגמת שימוש — להחליף ב-tables אמיתיים מ-Prisma:
   *
   *   const tables: ArchivableTable<any>[] = [
   *     {
   *       name: 'orders',
   *       fetchOlderThan: (d, t) =>
   *         prisma.order.findMany({ where: { createdAt: { lt: subDays(new Date(), d) }, archivedAt: null }, take: t }),
   *       markArchived: (ids) =>
   *         prisma.order.updateMany({ where: { id: { in: ids } }, data: { archivedAt: new Date() } }),
   *       hardDeleteOlderThan: async (d) =>
   *         (await prisma.order.deleteMany({ where: { createdAt: { lt: subDays(new Date(), d) } } })).count,
   *       getId: (r) => r.id,
   *     },
   *   ];
   *   runArchival(tables).catch(err => { console.error(err); process.exit(1); });
   */
  console.error('[ARCHIVAL] No tables configured — supply ArchivableTable[] in your worker.');
  process.exit(1);
}
