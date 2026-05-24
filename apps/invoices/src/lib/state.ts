// Document state machine.
//
// Lifecycle:
//   QUOTE  -> ORDER -> PROFORMA -> TAX_INVOICE -> RECEIPT
//                            \-> TAX_INVOICE_RECEIPT
//   any TAX_INVOICE / TAX_INVOICE_RECEIPT -> CREDIT_NOTE
//
// Statuses progress: DRAFT -> ISSUED -> SENT -> PARTIAL_PAID -> PAID
// or DRAFT -> ISSUED -> OVERDUE  (if dueDate passed and balance > 0)
// CANCELLED is terminal for non-tax docs only; tax docs must be reversed via CREDIT_NOTE.

import type { DocStatus, DocType } from '@prisma/client';

const ALLOWED_TRANSITIONS: Record<DocType, DocType[]> = {
  QUOTE: ['ORDER', 'PROFORMA', 'TAX_INVOICE', 'TAX_INVOICE_RECEIPT'],
  ORDER: ['PROFORMA', 'TAX_INVOICE', 'TAX_INVOICE_RECEIPT'],
  PO: [],
  PROFORMA: ['TAX_INVOICE', 'TAX_INVOICE_RECEIPT', 'RECEIPT'],
  TAX_INVOICE: ['RECEIPT', 'CREDIT_NOTE'],
  TAX_INVOICE_RECEIPT: ['CREDIT_NOTE'],
  RECEIPT: [],
  CREDIT_NOTE: [],
};

export function canConvert(from: DocType, to: DocType): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

const STATUS_FLOW: Record<DocStatus, DocStatus[]> = {
  DRAFT:        ['ISSUED', 'CANCELLED'],
  ISSUED:       ['SENT', 'PARTIAL_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'CREDITED'],
  SENT:         ['PARTIAL_PAID', 'PAID', 'OVERDUE', 'CREDITED'],
  PARTIAL_PAID: ['PAID', 'OVERDUE', 'CREDITED'],
  PAID:         ['CREDITED'],
  OVERDUE:      ['PARTIAL_PAID', 'PAID', 'CREDITED'],
  CANCELLED:    [],
  CREDITED:     [],
};

export function canTransition(from: DocStatus, to: DocStatus): boolean {
  if (from === to) return true;
  return STATUS_FLOW[from]?.includes(to) ?? false;
}

export function isTaxDoc(t: DocType): boolean {
  return t === 'TAX_INVOICE' || t === 'TAX_INVOICE_RECEIPT' || t === 'CREDIT_NOTE';
}
