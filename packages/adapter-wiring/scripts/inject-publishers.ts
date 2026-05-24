/**
 * inject-publishers.ts
 *
 * סקריפט שמזריק קריאות `eventBus.publish(...)` (דרך ה-Publishers) לתוך
 * פונקציות existing במודולים העסקיים. שימושי כאשר רוצים להפעיל את ה-wiring
 * על base-code שכבר קיים מבלי לערוך ידנית כל קובץ.
 *
 * הסקריפט מבצע transform AST פשוט: מאתר קריאות Prisma קונקרטיות (כמו
 * `prisma.customer.create(...)` ו-`prisma.order.update({ data: { status: 'APPROVED' } })`)
 * ומכניס אחריהן `await crmPublisher.publishCustomerCreated(...)`.
 *
 * הסקריפט תומך ב-`--dry-run` (דיווח בלבד) וב-`--write` (שמירת השינויים).
 *
 * הזרקות נתמכות:
 *  - prisma.customer.create        → crmPublisher.publishCustomerCreated
 *  - prisma.lead.create            → crmPublisher.publishLeadCreated
 *  - prisma.lead.update + qualified→ crmPublisher.publishLeadQualified
 *  - prisma.order.create           → ordersPublisher.publishOrderPlaced
 *  - prisma.order.update APPROVED  → ordersPublisher.publishOrderApproved
 *  - prisma.order.update CANCELLED → ordersPublisher.publishOrderCancelled
 *  - prisma.invoice.create         → financePublisher.publishInvoiceIssued
 *  - prisma.payment.create captured→ cardcomPublisher.publishPaymentCaptured
 *  - וכו'
 *
 * שימוש: pnpm inject --dir ../../apps/crm/src --write
 */

import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

interface InjectionRule {
  name: string;
  /** regex לזיהוי הקריאה לטיפול. נדרש group 0 = המשפט המלא */
  pattern: RegExp;
  /** שורת ההזרקה שמוכנסת מיד אחרי הקריאה */
  injection: (match: RegExpMatchArray) => string;
  /** סימן שכבר הוזרק (לא להזריק פעמיים) */
  alreadyInjectedMarker: string;
}

const RULES: InjectionRule[] = [
  {
    name: 'customer.create → publishCustomerCreated',
    pattern: /(const\s+(\w+)\s*=\s*await\s+prisma\.customer\.create\([\s\S]*?\)\s*;)/g,
    alreadyInjectedMarker: 'crmPublisher.publishCustomerCreated',
    injection: (m) => {
      const varName = m[2];
      return `\n  await crmPublisher.publishCustomerCreated({ customerId: ${varName}.id, leadId: ${varName}.leadId ?? undefined, name: ${varName}.name, email: ${varName}.email ?? undefined, phone: ${varName}.phone });`;
    },
  },
  {
    name: 'lead.create → publishLeadCreated',
    pattern: /(const\s+(\w+)\s*=\s*await\s+prisma\.lead\.create\([\s\S]*?\)\s*;)/g,
    alreadyInjectedMarker: 'crmPublisher.publishLeadCreated',
    injection: (m) => {
      const varName = m[2];
      return `\n  await crmPublisher.publishLeadCreated({ leadId: ${varName}.id, customerName: ${varName}.customerName, phone: ${varName}.phone, email: ${varName}.email ?? undefined, source: ${varName}.source });`;
    },
  },
  {
    name: 'order.create → publishOrderPlaced',
    pattern: /(const\s+(\w+)\s*=\s*await\s+prisma\.order\.create\([\s\S]*?\)\s*;)/g,
    alreadyInjectedMarker: 'ordersPublisher.publishOrderPlaced',
    injection: (m) => {
      const varName = m[2];
      return `\n  await ordersPublisher.publishOrderPlaced({ orderId: ${varName}.id, customerId: ${varName}.customerId, totalAmount: ${varName}.totalAmount, items: ${varName}.items ?? [], scheduledDate: ${varName}.scheduledDate });`;
    },
  },
  {
    name: 'order.update APPROVED → publishOrderApproved',
    pattern: /(const\s+(\w+)\s*=\s*await\s+prisma\.order\.update\([\s\S]*?status:\s*['"]APPROVED['"][\s\S]*?\)\s*;)/g,
    alreadyInjectedMarker: 'ordersPublisher.publishOrderApproved',
    injection: (m) => {
      const varName = m[2];
      return `\n  await ordersPublisher.publishOrderApproved({ orderId: ${varName}.id, approvedBy: ${varName}.approvedBy ?? 'system' });`;
    },
  },
  {
    name: 'order.update CANCELLED → publishOrderCancelled',
    pattern: /(const\s+(\w+)\s*=\s*await\s+prisma\.order\.update\([\s\S]*?status:\s*['"]CANCELLED['"][\s\S]*?\)\s*;)/g,
    alreadyInjectedMarker: 'ordersPublisher.publishOrderCancelled',
    injection: (m) => {
      const varName = m[2];
      return `\n  await ordersPublisher.publishOrderCancelled({ orderId: ${varName}.id, reason: ${varName}.cancelReason ?? 'unspecified', cancelledBy: ${varName}.cancelledBy ?? 'system', refundRequired: true });`;
    },
  },
  {
    name: 'invoice.create → publishInvoiceIssued',
    pattern: /(const\s+(\w+)\s*=\s*await\s+prisma\.invoice\.create\([\s\S]*?\)\s*;)/g,
    alreadyInjectedMarker: 'financePublisher.publishInvoiceIssued',
    injection: (m) => {
      const varName = m[2];
      return `\n  await financePublisher.publishInvoiceIssued({ invoiceId: ${varName}.id, orderId: ${varName}.orderId ?? undefined, customerId: ${varName}.customerId, totalAmount: ${varName}.totalAmount, dueDate: ${varName}.dueDate, items: ${varName}.items ?? [] });`;
    },
  },
  {
    name: 'payment captured → publishPaymentCaptured',
    pattern: /(const\s+(\w+)\s*=\s*await\s+prisma\.payment\.create\([\s\S]*?status:\s*['"]CAPTURED['"][\s\S]*?\)\s*;)/g,
    alreadyInjectedMarker: 'cardcomPublisher.publishPaymentCaptured',
    injection: (m) => {
      const varName = m[2];
      return `\n  await cardcomPublisher.publishPaymentCaptured({ paymentId: ${varName}.id, invoiceId: ${varName}.invoiceId, amount: ${varName}.amount, cardcomTransactionId: ${varName}.transactionRef });`;
    },
  },
];

interface InjectionReport {
  file: string;
  changes: Array<{ rule: string; count: number }>;
}

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) out.push(...(await walk(full)));
      else if (entry.isFile() && /\.(ts|js)$/.test(entry.name)) out.push(full);
    }
  } catch {
    // dir doesn't exist - skip
  }
  return out;
}

async function processFile(
  filePath: string,
  write: boolean,
): Promise<InjectionReport | null> {
  const original = await readFile(filePath, 'utf8');
  let content = original;
  const changes: Array<{ rule: string; count: number }> = [];

  for (const rule of RULES) {
    if (content.includes(rule.alreadyInjectedMarker)) continue;

    const matches = [...content.matchAll(rule.pattern)];
    if (matches.length === 0) continue;

    let offset = 0;
    for (const m of matches) {
      const insertAt = m.index! + m[0].length + offset;
      const injection = rule.injection(m);
      content = content.slice(0, insertAt) + injection + content.slice(insertAt);
      offset += injection.length;
    }
    changes.push({ rule: rule.name, count: matches.length });
  }

  if (changes.length === 0) return null;
  if (write && content !== original) {
    await writeFile(filePath, content, 'utf8');
  }
  return { file: filePath, changes };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dirIdx = args.indexOf('--dir');
  const dir = dirIdx >= 0 ? args[dirIdx + 1] : process.cwd();
  const write = args.includes('--write');

  console.log(`──────────────────────────────────────────`);
  console.log(` inject-publishers   dir=${dir}  write=${write}`);
  console.log(`──────────────────────────────────────────\n`);

  const dirStat = await stat(dir).catch(() => null);
  if (!dirStat || !dirStat.isDirectory()) {
    console.error(`ERR: dir לא קיים: ${dir}`);
    process.exit(1);
  }

  const files = await walk(dir);
  console.log(`סורק ${files.length} קבצים...\n`);

  const reports: InjectionReport[] = [];
  for (const f of files) {
    const r = await processFile(f, write);
    if (r) reports.push(r);
  }

  if (reports.length === 0) {
    console.log('לא נמצאו הזרקות.');
    return;
  }

  for (const r of reports) {
    console.log(`* ${r.file.replace(dir, '')}`);
    for (const c of r.changes) {
      console.log(`    + ${c.rule} (${c.count})`);
    }
  }
  console.log(`\nסה"כ קבצים שונו: ${reports.length}`);
  if (!write) console.log('[dry-run] הוסף --write כדי לשמור');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
