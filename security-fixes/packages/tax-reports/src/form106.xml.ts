/**
 * טופס 106 — דו"ח שכר שנתי לעובד (פורמט Mai101 XML)
 * ---------------------------------------------------------------
 * הפורמט תואם למפרט רשות המסים "Mai101" (תאריך 1.1.2025).
 * המבנה: <Mai101><Header/><Employer/><Employees><Employee106/></Employees></Mai101>
 *
 * אזהרות:
 *   - שדות ת.ז. ב-9 ספרות עם 0 מוביל.
 *   - סכומים באגורות (integer), ללא נקודה עשרונית.
 *   - תאריכים בפורמט YYYYMMDD.
 *   - תקופה: שנת מס מלאה (YYYY).
 */

import { create } from 'xmlbuilder2';

export interface Form106Header {
  taxYear: number;                    // 2025
  employerTaxId: string;              // ת.ז./ח.פ. מעסיק (9 ספרות)
  employerName: string;
  generatedAt: Date;
  controlNumber: string;              // מספר שורש לקובץ
}

export interface Form106Employee {
  taxId: string;                      // 9 ספרות
  fullName: string;
  startDate: Date;
  endDate?: Date;
  /** סכומים שנתיים באגורות */
  grossSalaryAgorot: number;
  taxableSalaryAgorot: number;
  incomeTaxAgorot: number;
  nationalInsuranceAgorot: number;
  healthInsuranceAgorot: number;
  pensionEmployerAgorot: number;
  pensionEmployeeAgorot: number;
  studyFundEmployerAgorot: number;
  studyFundEmployeeAgorot: number;
  severanceAgorot: number;
}

function pad9(id: string): string {
  return id.replace(/\D/g, '').padStart(9, '0');
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

export function generateForm106Xml(
  header: Form106Header,
  employees: Form106Employee[],
): string {
  const doc = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('Mai101', { Format: '106', Version: '2025.1' })
      .ele('Header')
        .ele('ControlNumber').txt(header.controlNumber).up()
        .ele('TaxYear').txt(String(header.taxYear)).up()
        .ele('GeneratedAt').txt(fmtDate(header.generatedAt)).up()
        .ele('EmployerTaxId').txt(pad9(header.employerTaxId)).up()
        .ele('EmployerName').txt(header.employerName).up()
      .up()
      .ele('Employees');

  for (const e of employees) {
    doc.ele('Employee106')
      .ele('TaxId').txt(pad9(e.taxId)).up()
      .ele('FullName').txt(e.fullName).up()
      .ele('EmploymentStart').txt(fmtDate(e.startDate)).up()
      .ele('EmploymentEnd').txt(e.endDate ? fmtDate(e.endDate) : '').up()
      .ele('GrossSalary').txt(String(e.grossSalaryAgorot)).up()
      .ele('TaxableSalary').txt(String(e.taxableSalaryAgorot)).up()
      .ele('IncomeTax').txt(String(e.incomeTaxAgorot)).up()
      .ele('NationalInsurance').txt(String(e.nationalInsuranceAgorot)).up()
      .ele('HealthInsurance').txt(String(e.healthInsuranceAgorot)).up()
      .ele('PensionEmployer').txt(String(e.pensionEmployerAgorot)).up()
      .ele('PensionEmployee').txt(String(e.pensionEmployeeAgorot)).up()
      .ele('StudyFundEmployer').txt(String(e.studyFundEmployerAgorot)).up()
      .ele('StudyFundEmployee').txt(String(e.studyFundEmployeeAgorot)).up()
      .ele('Severance').txt(String(e.severanceAgorot)).up()
      .up();
  }

  return doc.end({ prettyPrint: true });
}
