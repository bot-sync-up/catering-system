import type { Invoice } from '../vision/schema.js';
import type { ItemMatch } from '../matching/items.js';
import type { POMatchResult } from '../matching/po.js';

export type AlertKind =
  | 'duplicate'
  | 'price-spike'
  | 'po-mismatch'
  | 'payment-due'
  | 'low-confidence'
  | 'unknown-supplier';

export interface Alert {
  kind: AlertKind;
  severity: 'info' | 'warn' | 'critical';
  message: string;
  invoiceNum?: string;
  supplierTaxId?: string;
  data?: Record<string, unknown>;
}

export interface Notifier {
  send(alert: Alert): Promise<void>;
}

const PRICE_THRESHOLD = Number(process.env.ALERT_PRICE_THRESHOLD || '0.30');

export function buildAlerts(opts: {
  invoice: Invoice;
  isDuplicate: boolean;
  itemMatches: ItemMatch[];
  poMatch: POMatchResult;
  supplierKnown: boolean;
}): Alert[] {
  const alerts: Alert[] = [];
  const { invoice, isDuplicate, itemMatches, poMatch, supplierKnown } = opts;

  if (isDuplicate) {
    alerts.push({
      kind: 'duplicate',
      severity: 'warn',
      message: `חשבונית ${invoice.invoiceNum} כבר נקלטה`,
      invoiceNum: invoice.invoiceNum,
      supplierTaxId: invoice.supplier.taxId,
    });
  }

  if (!supplierKnown) {
    alerts.push({
      kind: 'unknown-supplier',
      severity: 'info',
      message: `ספק חדש: ${invoice.supplier.name} (ח.פ ${invoice.supplier.taxId})`,
      invoiceNum: invoice.invoiceNum,
      supplierTaxId: invoice.supplier.taxId,
    });
  }

  for (const m of itemMatches) {
    if (m.priceDelta != null && Math.abs(m.priceDelta) > PRICE_THRESHOLD) {
      alerts.push({
        kind: 'price-spike',
        severity: 'critical',
        message: `שינוי מחיר חריג ב-"${m.invoiceItem.desc}": ${(m.priceDelta * 100).toFixed(1)}%`,
        invoiceNum: invoice.invoiceNum,
        data: { sku: m.match?.sku, old: m.match?.lastPrice, new: m.invoiceItem.price },
      });
    }
  }

  if (poMatch.po && Math.abs(poMatch.totalDelta) > 0.01) {
    alerts.push({
      kind: 'po-mismatch',
      severity: poMatch.totalDelta > 0 ? 'critical' : 'warn',
      message: `פער מהזמנת רכש ${poMatch.po.id}: ${(poMatch.totalDelta * 100).toFixed(2)}%`,
      invoiceNum: invoice.invoiceNum,
      data: { poId: poMatch.po.id, poTotal: poMatch.po.total, invoiceTotal: invoice.total },
    });
  }

  if (invoice.dueDate) {
    const due = new Date(invoice.dueDate);
    const days = Math.ceil((due.getTime() - Date.now()) / 86_400_000);
    if (days <= 7) {
      alerts.push({
        kind: 'payment-due',
        severity: days < 0 ? 'critical' : 'warn',
        message:
          days < 0
            ? `חשבונית ${invoice.invoiceNum} באיחור ${-days} ימים`
            : `תזכורת תשלום: ${invoice.invoiceNum} בעוד ${days} ימים`,
        invoiceNum: invoice.invoiceNum,
      });
    }
  }

  return alerts;
}

/** Console notifier - swap for email/webhook in production. */
export class ConsoleNotifier implements Notifier {
  async send(alert: Alert): Promise<void> {
    const tag = alert.severity.toUpperCase();
    // eslint-disable-next-line no-console
    console.log(`[${tag}] [${alert.kind}] ${alert.message}`);
  }
}
