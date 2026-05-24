/**
 * BankReconciler — מנוע התאמה בין תנועות בנק לבין חשבוניות במערכת.
 *
 * שיטה: התאמה דו-שלבית
 *   1. exact match — אותו סכום + טווח 3 ימים סביב התאריך.
 *   2. fuzzy match — סכום ±0.5% (עמלות), חלון 7 ימים.
 *
 * תנועה ש"דבקה" לחשבונית לא חוזרת לסבב הבא.
 */

export interface BankTransaction {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  amountIls: number;
  description?: string;
}

export interface OpenInvoice {
  invoiceNumber: string;
  /** YYYY-MM-DD — תאריך הוצאה. */
  issueDate: string;
  totalIls: number;
  customer: string;
}

export interface ReconciliationMatch {
  invoiceNumber: string;
  bankTransactionId: string;
  matchType: "exact" | "fuzzy";
  confidence: number; // 0..1
}

export interface ReconciliationResult {
  matches: ReconciliationMatch[];
  unmatchedTransactions: BankTransaction[];
  unmatchedInvoices: OpenInvoice[];
}

export class BankReconciler {
  reconcile(transactions: BankTransaction[], invoices: OpenInvoice[]): ReconciliationResult {
    const matches: ReconciliationMatch[] = [];
    const usedTx = new Set<string>();
    const usedInv = new Set<string>();

    // exact
    for (const inv of invoices) {
      for (const tx of transactions) {
        if (usedTx.has(tx.id)) continue;
        if (Math.abs(tx.amountIls - inv.totalIls) < 0.005 && daysBetween(inv.issueDate, tx.date) <= 3) {
          matches.push({ invoiceNumber: inv.invoiceNumber, bankTransactionId: tx.id, matchType: "exact", confidence: 1 });
          usedTx.add(tx.id);
          usedInv.add(inv.invoiceNumber);
          break;
        }
      }
    }

    // fuzzy
    for (const inv of invoices) {
      if (usedInv.has(inv.invoiceNumber)) continue;
      for (const tx of transactions) {
        if (usedTx.has(tx.id)) continue;
        const delta = Math.abs(tx.amountIls - inv.totalIls) / Math.max(1, inv.totalIls);
        if (delta <= 0.005 && daysBetween(inv.issueDate, tx.date) <= 7) {
          matches.push({
            invoiceNumber: inv.invoiceNumber,
            bankTransactionId: tx.id,
            matchType: "fuzzy",
            confidence: 1 - delta * 20,
          });
          usedTx.add(tx.id);
          usedInv.add(inv.invoiceNumber);
          break;
        }
      }
    }

    return {
      matches,
      unmatchedTransactions: transactions.filter((t) => !usedTx.has(t.id)),
      unmatchedInvoices: invoices.filter((i) => !usedInv.has(i.invoiceNumber)),
    };
  }
}

function daysBetween(aIso: string, bIso: string): number {
  const a = Date.parse(aIso);
  const b = Date.parse(bIso);
  return Math.abs((a - b) / (1000 * 60 * 60 * 24));
}
