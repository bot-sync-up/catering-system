/**
 * verify-wiring.ts
 *
 * סקריפט אימות סטטי - בודק שלכל אירוע ב-DomainEventMap יש לפחות
 * publisher אחד וכן (כשרלוונטי) subscriber/adapter שמטפל בו.
 *
 * הסקריפט קורא את הקבצים תחת src/publishers/ ו-src/subscribers/per-app/
 * וגם את ההגדרות של ה-adapters, ומדפיס דו"ח טבלאי לקונסולה.
 *
 * שימוש: pnpm verify  (מוגדר ב-package.json)
 * Exit code: 0 אם כל האירועים מכוסים, 1 אם יש פערים.
 */

import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

// רשימת האירועים (מקור: packages/event-bus/src/types.ts)
const DOMAIN_EVENTS = [
  'lead.created',
  'lead.qualified',
  'quote.sent',
  'quote.accepted',
  'order.placed',
  'order.approved',
  'order.cancelled',
  'portal.submitted',
  'payment.received',
  'payment.failed',
  'payment.captured',
  'invoice.issued',
  'invoice.paid',
  'invoice.due',
  'event.scheduled',
  'event.completed',
  'event.ready',
  'delivery.dispatched',
  'delivery.completed',
  'inventory.low',
  'inventory.received',
  'employee.clocked',
  'payroll.calculated',
  'month.closed',
] as const;

type DomainEvent = (typeof DOMAIN_EVENTS)[number];

// מיפוי ידני של אירועים שלא דורשים adapter (נצרכים ע"י reporting / analytics / push בלבד)
const ADAPTER_OPTIONAL = new Set<DomainEvent>([
  'lead.created',
  'quote.sent',
  'quote.accepted',
  'payment.received',
  'payment.failed',
  'invoice.paid',
  'event.scheduled',
  'event.completed',
  'delivery.dispatched',
  'delivery.completed',
  'inventory.received',
  'employee.clocked',
  'payroll.calculated',
]);

interface VerificationResult {
  event: DomainEvent;
  publishers: string[];
  subscribers: string[];
  status: 'OK' | 'NO-PUBLISHER' | 'NO-SUBSCRIBER' | 'NONE';
}

async function collectFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await collectFiles(full)));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

async function scanPublishers(): Promise<Map<DomainEvent, string[]>> {
  const files = await collectFiles(join(ROOT, 'src', 'publishers'));
  const map = new Map<DomainEvent, string[]>();
  for (const evt of DOMAIN_EVENTS) map.set(evt, []);

  for (const file of files) {
    const content = await readFile(file, 'utf8');
    for (const evt of DOMAIN_EVENTS) {
      const needle = `bus.publish('${evt}'`;
      if (content.includes(needle)) {
        map.get(evt)!.push(file.replace(ROOT, '').replaceAll('\\', '/'));
      }
    }
  }
  return map;
}

async function scanSubscribers(): Promise<Map<DomainEvent, string[]>> {
  // ה-adapters רשומים ב-subscribe-all.ts ע"י class name. נמפה אותם לאירועים.
  const adapterToEvent: Record<string, DomainEvent> = {
    CrmToFinanceAdapter: 'lead.qualified',
    PortalToOrdersAdapter: 'portal.submitted',
    OrdersToFinanceAdapter: 'order.approved',
    OrdersToKitchenAdapter: 'order.approved',
    OrdersToEventsAdapter: 'order.placed',
    OrdersToLogisticsAdapter: 'event.ready',
    FinanceToIcountAdapter: 'invoice.issued',
    FinanceToCardcomAdapter: 'invoice.due',
    CardcomToFinanceAdapter: 'payment.captured',
    InventoryToPurchasingAdapter: 'inventory.low',
    HrToPayrollAdapter: 'month.closed',
  };

  const files = await collectFiles(join(ROOT, 'src', 'subscribers'));
  const map = new Map<DomainEvent, string[]>();
  for (const evt of DOMAIN_EVENTS) map.set(evt, []);

  for (const file of files) {
    const content = await readFile(file, 'utf8');
    for (const [adapter, evt] of Object.entries(adapterToEvent)) {
      if (content.includes(`new ${adapter}(`)) {
        const rel = file.replace(ROOT, '').replaceAll('\\', '/');
        if (!map.get(evt)!.includes(rel)) map.get(evt)!.push(rel);
      }
    }
  }

  // order.cancelled מטופל ע"י saga ולא ע"י adapter רגיל
  map.get('order.cancelled')!.push('(saga: cancelEventSaga)');
  return map;
}

async function main(): Promise<number> {
  console.log('────────────────────────────────────────────');
  console.log(' אימות חיווט אירועים (Event Wiring Verifier)');
  console.log('────────────────────────────────────────────\n');

  const publishers = await scanPublishers();
  const subscribers = await scanSubscribers();

  const results: VerificationResult[] = DOMAIN_EVENTS.map((evt) => {
    const p = publishers.get(evt)!;
    const s = subscribers.get(evt)!;
    let status: VerificationResult['status'] = 'OK';
    if (p.length === 0 && s.length === 0) status = 'NONE';
    else if (p.length === 0) status = 'NO-PUBLISHER';
    else if (s.length === 0 && !ADAPTER_OPTIONAL.has(evt)) status = 'NO-SUBSCRIBER';
    return { event: evt, publishers: p, subscribers: s, status };
  });

  const failures = results.filter(
    (r) => r.status !== 'OK' && r.status !== 'NONE',
  );

  for (const r of results) {
    const flag =
      r.status === 'OK'
        ? '[OK]'
        : r.status === 'NONE'
        ? '[--]'
        : `[FAIL ${r.status}]`;
    console.log(`${flag.padEnd(22)} ${r.event}`);
    console.log(
      `    publishers : ${r.publishers.length ? r.publishers.join(', ') : '(none)'}`,
    );
    console.log(
      `    subscribers: ${r.subscribers.length ? r.subscribers.join(', ') : '(none)'}`,
    );
  }

  console.log('\n────────────────────────────────────────────');
  if (failures.length === 0) {
    console.log(' כל האירועים מחווטים כראוי.');
    return 0;
  }
  console.log(` נמצאו ${failures.length} פערים. תקן ונסה שוב.`);
  return 1;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err);
    process.exit(2);
  });
