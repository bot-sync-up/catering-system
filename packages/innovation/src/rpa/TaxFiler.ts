/**
 * TaxFiler — מחולל קבצי דיווח 102 ו-126 לרשות המסים.
 *
 * 102 = ניכויים חודשי (משכורות + ספקים).
 * 126 = דיווח שנתי מפורט על משכורות.
 *
 * הקבצים הם טקסט קבוע-שדות (Fixed-width) כפי שמצופה ע"י השב"א.
 * המודול בונה את התוכן בלבד — חיבור לשב"א הוא חיצוני.
 */

export interface Form102Row {
  /** מספר עוסק / ת.ז. של מנוכה. */
  withheldId: string;
  /** סוג ניכוי — 'salary' או 'supplier'. */
  kind: "salary" | "supplier";
  grossAmountIls: number;
  withheldAmountIls: number;
}

export interface Form102Input {
  reportingTaxId: string; // מספר עוסק של החברה המדווחת
  /** YYYYMM */
  period: string;
  rows: Form102Row[];
}

export interface Form126Row {
  employeeId: string;
  fullName: string;
  /** שכר ברוטו שנתי. */
  grossAnnualIls: number;
  /** מס הכנסה שנוכה. */
  incomeTaxIls: number;
  /** ביטוח לאומי שנוכה. */
  nationalInsuranceIls: number;
  /** מס בריאות. */
  healthIls: number;
}

export interface Form126Input {
  reportingTaxId: string;
  /** YYYY */
  year: string;
  rows: Form126Row[];
}

export class TaxFiler {
  /** מחזיר תוכן טקסט תקני של טופס 102. */
  buildForm102(input: Form102Input): string {
    const header = padField("H", 1) + padField(input.reportingTaxId, 9) + padField(input.period, 6);
    const lines = input.rows.map((row) =>
      [
        padField("D", 1),
        padField(row.withheldId, 9),
        padField(row.kind === "salary" ? "1" : "2", 1),
        padNumber(row.grossAmountIls, 12),
        padNumber(row.withheldAmountIls, 12),
      ].join(""),
    );
    const totalGross = sum(input.rows.map((r) => r.grossAmountIls));
    const totalWithheld = sum(input.rows.map((r) => r.withheldAmountIls));
    const footer =
      padField("T", 1) + padNumber(input.rows.length, 6) + padNumber(totalGross, 14) + padNumber(totalWithheld, 14);
    return [header, ...lines, footer].join("\n") + "\n";
  }

  /** מחזיר תוכן טקסט תקני של טופס 126. */
  buildForm126(input: Form126Input): string {
    const header = padField("H126", 4) + padField(input.reportingTaxId, 9) + padField(input.year, 4);
    const lines = input.rows.map((row) =>
      [
        padField("E", 1),
        padField(row.employeeId, 9),
        padField(row.fullName, 30),
        padNumber(row.grossAnnualIls, 14),
        padNumber(row.incomeTaxIls, 14),
        padNumber(row.nationalInsuranceIls, 12),
        padNumber(row.healthIls, 12),
      ].join(""),
    );
    const footer = padField("T126", 4) + padNumber(input.rows.length, 6);
    return [header, ...lines, footer].join("\n") + "\n";
  }
}

function padField(value: string, length: number): string {
  return value.length >= length ? value.slice(0, length) : value + " ".repeat(length - value.length);
}

function padNumber(value: number, length: number): string {
  // אגורות (כפול 100), בלי נקודה עשרונית, padded ב-0 משמאל
  const intCents = Math.round(value * 100).toString();
  if (intCents.length >= length) return intCents.slice(-length);
  return "0".repeat(length - intCents.length) + intCents;
}

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}
