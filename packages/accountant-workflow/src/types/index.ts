/**
 * טיפוסים משותפים למחוללי קבצים ולפורטל הרו"ח.
 */

export type ReportFormType =
  | 'PCN874'
  | 'FORM856'
  | 'FORM856_PART_A'
  | 'FORM856_PART_B'
  | 'FORM102'
  | 'FORM126'
  | 'INCOME_STATEMENT'
  | 'BALANCE_SHEET'
  | 'JOURNAL_ENTRIES';

export type ReportStatus = 'pending' | 'downloaded' | 'submitted' | 'confirmed';

export interface ReportPeriod {
  /** YYYY-MM (חודשי) או YYYY (שנתי) */
  period: string;
  year: number;
  /** רק לדוחות חודשיים */
  month?: number;
}

export interface BusinessIdentity {
  taxId: string;            // ע.מ. / ח.פ. - 9 ספרות
  vatNumber: string;        // מספר עוסק מורשה (לרוב זהה ל-taxId)
  legalName: string;
  reportingMonth?: number;  // 1-12
  reportingYear: number;
}

export interface VatTransaction {
  date: string;             // ISO YYYY-MM-DD
  documentType: 'invoice' | 'credit' | 'receipt' | 'import';
  documentNumber: string;
  counterpartyTaxId: string;
  /** סכום ללא מע"מ */
  amountExVat: number;
  /** סכום המע"מ */
  vatAmount: number;
}

export interface CustomerSupplierAnnualRecord {
  taxId: string;
  name: string;
  totalAmount: number;
  totalVat: number;
}

export interface PayrollEmployee {
  employeeId: string;       // מס' עובד / ת.ז.
  fullName: string;
  grossSalary: number;
  incomeTax: number;        // ניכוי מס הכנסה
  socialSecurity: number;   // ביטוח לאומי
  healthTax: number;        // מס בריאות
}

export interface JournalLine {
  date: string;
  account: string;
  description: string;
  debit: number;
  credit: number;
  reference?: string;
}

export interface BalanceSheetRow {
  account: string;
  category: 'asset' | 'liability' | 'equity';
  amount: number;
}

export interface IncomeStatementRow {
  account: string;
  category: 'revenue' | 'cogs' | 'operating-expense' | 'tax' | 'other';
  amount: number;
}

export interface GeneratedFile {
  id: string;
  formType: ReportFormType;
  period: ReportPeriod;
  fileName: string;
  /** Absolute path במערכת הקבצים */
  filePath: string;
  /** sha256 hex */
  checksum: string;
  byteSize: number;
  generatedAt: string;     // ISO timestamp
  status: ReportStatus;
  submittedAt?: string;
  submissionReference?: string;
  downloadedAt?: string;
  confirmedAt?: string;
}

export interface GeneratorContext {
  business: BusinessIdentity;
  period: ReportPeriod;
  /** מערכת קבצים מוזרקת - מאפשר Mock בבדיקות */
  fs?: AccountantFsAdapter;
  /** Hook קריאות לבסיס נתונים - בפועל יוזרק מהאפליקציה */
  data: GeneratorDataInputs;
}

export interface GeneratorDataInputs {
  vatTransactions?: VatTransaction[];
  customers?: CustomerSupplierAnnualRecord[];
  suppliers?: CustomerSupplierAnnualRecord[];
  employees?: PayrollEmployee[];
  journalLines?: JournalLine[];
  balanceSheet?: BalanceSheetRow[];
  incomeStatement?: IncomeStatementRow[];
}

/**
 * חוזה מינימלי עבור מערכת הקבצים - מאפשר fakeFs בבדיקות בלי לגעת בדיסק.
 */
export interface AccountantFsAdapter {
  writeFile(path: string, content: Buffer | string): Promise<void>;
  readFile(path: string): Promise<Buffer>;
  exists(path: string): Promise<boolean>;
  mkdir(path: string, recursive?: boolean): Promise<void>;
  unlink(path: string): Promise<void>;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  action:
    | 'file.generated'
    | 'file.downloaded'
    | 'file.marked-submitted'
    | 'file.confirmed'
    | 'config.mode-changed'
    | 'portal.login';
  fileId?: string;
  submissionReference?: string;
  metadata?: Record<string, unknown>;
}

export interface AccountantRole {
  userId: string;
  role: 'accountant' | 'general-manager' | 'staff';
}
