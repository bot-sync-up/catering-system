/**
 * ExcelImportWizard — אשף גנרי לייבוא Excel/CSV למסד נתונים.
 *
 * שלבים:
 *  1. detectColumns — קריאת header והצעת מיפוי לעמודות יעד
 *  2. previewMapping — תצוגה מקדימה עם 10 שורות
 *  3. validate — בדיקת שדות חובה / סוגי נתונים
 *  4. import — הכנסה למסד נתונים (יעד חיצוני דרך callback)
 */

import ExcelJS from 'exceljs';
import { parse as parseCsv } from 'csv-parse/sync';
import fs from 'fs/promises';

export interface TargetField {
  key: string;
  labelHe: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  required: boolean;
}

export interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
}

export interface ImportPreview {
  headers: string[];
  suggestedMapping: ColumnMapping[];
  sampleRows: Record<string, unknown>[];
  totalRows: number;
}

export interface ValidationError {
  rowIndex: number;
  field: string;
  message: string;
}

export type ImportSink = (rows: Array<Record<string, unknown>>) => Promise<void>;

export class ExcelImportWizard {
  /** קריאת קובץ והצעת מיפוי */
  async detectColumns(filePath: string, targets: TargetField[]): Promise<ImportPreview> {
    const rows = await this.readRows(filePath);
    if (rows.length === 0) {
      return { headers: [], suggestedMapping: [], sampleRows: [], totalRows: 0 };
    }
    const headers = Object.keys(rows[0]);
    const suggested = this.suggestMapping(headers, targets);
    return {
      headers,
      suggestedMapping: suggested,
      sampleRows: rows.slice(0, 10),
      totalRows: rows.length,
    };
  }

  /** ולידציה לפי מיפוי */
  async validate(
    filePath: string,
    mapping: ColumnMapping[],
    targets: TargetField[]
  ): Promise<ValidationError[]> {
    const rows = await this.readRows(filePath);
    const errors: ValidationError[] = [];
    const targetsByKey = new Map(targets.map(t => [t.key, t]));

    rows.forEach((row, i) => {
      for (const m of mapping) {
        const target = targetsByKey.get(m.targetField);
        if (!target) continue;
        const v = row[m.sourceColumn];
        if (target.required && (v == null || v === '')) {
          errors.push({ rowIndex: i, field: m.targetField, message: 'שדה חובה ריק' });
          continue;
        }
        if (v != null && !this.checkType(v, target.type)) {
          errors.push({
            rowIndex: i,
            field: m.targetField,
            message: `סוג שגוי — צפוי ${target.type}`,
          });
        }
      }
    });
    return errors;
  }

  /** ייבוא בפועל — שולח לסינק במנות */
  async import(
    filePath: string,
    mapping: ColumnMapping[],
    sink: ImportSink,
    batchSize = 500
  ): Promise<{ imported: number }> {
    const rows = await this.readRows(filePath);
    let imported = 0;
    let batch: Array<Record<string, unknown>> = [];

    for (const row of rows) {
      const mapped: Record<string, unknown> = {};
      for (const m of mapping) {
        mapped[m.targetField] = row[m.sourceColumn];
      }
      batch.push(mapped);
      if (batch.length >= batchSize) {
        await sink(batch);
        imported += batch.length;
        batch = [];
      }
    }
    if (batch.length) {
      await sink(batch);
      imported += batch.length;
    }
    return { imported };
  }

  private async readRows(filePath: string): Promise<Array<Record<string, unknown>>> {
    if (filePath.endsWith('.csv')) {
      const raw = await fs.readFile(filePath);
      return parseCsv(raw, { columns: true, skip_empty_lines: true, trim: true });
    }
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(filePath);
    const sheet = wb.worksheets[0];
    if (!sheet) return [];
    const headers: string[] = [];
    sheet.getRow(1).eachCell(c => headers.push(String(c.value ?? '').trim()));
    const out: Array<Record<string, unknown>> = [];
    sheet.eachRow((row, rowNum) => {
      if (rowNum === 1) return;
      const obj: Record<string, unknown> = {};
      headers.forEach((h, i) => {
        obj[h] = row.getCell(i + 1).value;
      });
      out.push(obj);
    });
    return out;
  }

  private suggestMapping(headers: string[], targets: TargetField[]): ColumnMapping[] {
    const out: ColumnMapping[] = [];
    for (const t of targets) {
      const match = headers.find(
        h =>
          h.toLowerCase().includes(t.key.toLowerCase()) ||
          h.includes(t.labelHe)
      );
      if (match) out.push({ sourceColumn: match, targetField: t.key });
    }
    return out;
  }

  private checkType(v: unknown, type: TargetField['type']): boolean {
    switch (type) {
      case 'string':
        return typeof v === 'string' || typeof v === 'number';
      case 'number':
        return typeof v === 'number' || !isNaN(parseFloat(String(v)));
      case 'date':
        return v instanceof Date || !isNaN(new Date(String(v)).getTime());
      case 'boolean':
        return typeof v === 'boolean' || ['true', 'false', '0', '1'].includes(String(v).toLowerCase());
    }
  }
}
