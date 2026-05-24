/**
 * HashavshevetDbfReader — קריאת קבצי DBF של חשבשבת ייצוא.
 *
 * חשבשבת מייצאת רוב הנתונים לקבצי DBF (dBase III/IV) — לקוחות, פריטים, תנועות.
 * הקלאס מספק קריאה גנרית + מיפויים סטנדרטיים לטבלאות הנפוצות.
 */

import fs from 'fs/promises';

export interface HashavshevetRecord {
  [field: string]: string | number | boolean | Date | null;
}

export interface ReadOptions {
  /** קידוד התווים — חשבשבת לרוב Windows-1255 (עברית) */
  encoding?: 'utf8' | 'win1255';
  /** טבלה סטנדרטית — מיפוי שדות אוטומטי */
  table?: 'customers' | 'items' | 'transactions' | 'accounts';
}

/**
 * מיפוי שדות סטנדרטיים מטבלאות חשבשבת לשמות בעברית/אנגלית קריאים.
 */
export const HASHAVSHEVET_FIELD_MAPS = {
  customers: {
    KOD: 'customerCode',
    SHEM: 'name',
    KTOVET: 'address',
    IR: 'city',
    MIKUD: 'zipCode',
    TEL: 'phone',
    EMAIL: 'email',
    OSEK: 'businessId',
  },
  items: {
    MAKAT: 'sku',
    SHEM: 'name',
    YEHIDA: 'unit',
    MEHIR: 'price',
    MLAY: 'stockQty',
  },
  transactions: {
    ASMACHTA: 'reference',
    TAARICH: 'date',
    HOVA: 'debit',
    ZCHUT: 'credit',
    PEROOT: 'description',
    KOD_TENUOA: 'transactionCode',
  },
  accounts: {
    HESHBON: 'accountNumber',
    SHEM: 'accountName',
    SUG: 'accountType',
  },
} as const;

export class HashavshevetDbfReader {
  /**
   * קורא קובץ DBF ומחזיר מערך רשומות.
   * שים לב: מימוש מלא של DBF דורש ספרייה ייעודית (dbf-reader);
   * כאן הקוד שלד שמדגים את ה-API והמיפויים.
   */
  async read(filePath: string, opts: ReadOptions = {}): Promise<HashavshevetRecord[]> {
    const buf = await fs.readFile(filePath);
    const records = this.parseDbf(buf, opts.encoding ?? 'win1255');

    if (opts.table) {
      const map = HASHAVSHEVET_FIELD_MAPS[opts.table];
      return records.map(r => this.applyMap(r, map));
    }
    return records;
  }

  /** ייבוא תיקייה שלמה של DBFs (לקוחות + פריטים + תנועות) */
  async readDirectory(dirPath: string): Promise<{
    customers: HashavshevetRecord[];
    items: HashavshevetRecord[];
    transactions: HashavshevetRecord[];
    accounts: HashavshevetRecord[];
  }> {
    const files = await fs.readdir(dirPath);
    const result = { customers: [], items: [], transactions: [], accounts: [] } as Record<
      'customers' | 'items' | 'transactions' | 'accounts',
      HashavshevetRecord[]
    >;

    for (const f of files) {
      const lower = f.toLowerCase();
      if (lower.includes('cust') || lower.includes('lakoach')) {
        result.customers.push(...(await this.read(`${dirPath}/${f}`, { table: 'customers' })));
      } else if (lower.includes('item') || lower.includes('prit')) {
        result.items.push(...(await this.read(`${dirPath}/${f}`, { table: 'items' })));
      } else if (lower.includes('tnuot') || lower.includes('trans')) {
        result.transactions.push(...(await this.read(`${dirPath}/${f}`, { table: 'transactions' })));
      } else if (lower.includes('hesh') || lower.includes('account')) {
        result.accounts.push(...(await this.read(`${dirPath}/${f}`, { table: 'accounts' })));
      }
    }
    return result;
  }

  private parseDbf(_buf: Buffer, _encoding: string): HashavshevetRecord[] {
    // placeholder — מימוש מלא יעשה שימוש ב-dbf-reader
    // קוראים header (32 bytes) + field descriptors (32 bytes כל אחד) + records
    return [];
  }

  private applyMap(record: HashavshevetRecord, map: Record<string, string>): HashavshevetRecord {
    const mapped: HashavshevetRecord = {};
    for (const [src, val] of Object.entries(record)) {
      const target = map[src.toUpperCase()] ?? src;
      mapped[target] = val;
    }
    return mapped;
  }
}
