import 'dotenv/config';
import { alertsQueue, enqueueDailyScan, enqueueRefreshAll } from './queue.js';

// תזמון repeatable — כל יום ב-07:00 שעון ישראל
async function main() {
  await alertsQueue.add(
    'daily-scan',
    {},
    {
      repeat: { pattern: '0 7 * * *', tz: 'Asia/Jerusalem' },
      jobId: 'repeat:daily-scan',
      removeOnComplete: 50,
    },
  );
  await alertsQueue.add(
    'refresh-all',
    {},
    {
      repeat: { pattern: '0 6 * * *', tz: 'Asia/Jerusalem' },
      jobId: 'repeat:refresh-all',
      removeOnComplete: 50,
    },
  );
  // הרצה ראשונית
  await enqueueRefreshAll();
  await enqueueDailyScan();
  console.log('Scheduler set: daily-scan @ 07:00, refresh-all @ 06:00 Asia/Jerusalem');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
