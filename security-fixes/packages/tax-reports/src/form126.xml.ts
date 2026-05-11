/**
 * טופס 126 — סיכום שנתי לכלל העובדים (פורמט Mai101)
 * ---------------------------------------------------------------
 * דו"ח שנתי המוגש למשרד האוצר (יחידת השכר), המסכם את
 * כל העובדים והתשלומים בשנת המס. נדרש להגשה עד 30/04 לכל שנה
 * בגין השנה שחלפה.
 */

import { create } from 'xmlbuilder2';
import type { Form106Employee } from './form106.xml';

export interface Form126Header {
  taxYear: number;
  employerTaxId: string;
  employerName: string;
  employerAddress?: string;
  generatedAt: Date;
  controlNumber: string;
}

function pad9(id: string): string {
  return id.replace(/\D/g, '').padStart(9, '0');
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

function sum(arr: Form106Employee[], key: keyof Form106Employee): number {
  return arr.reduce((s, e) => s + Number(e[key] ?? 0), 0);
}

export function generateForm126Xml(
  header: Form126Header,
  employees: Form106Employee[],
): string {
  const doc = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('Mai101', { Format: '126', Version: '2025.1' })
      .ele('Header')
        .ele('ControlNumber').txt(header.controlNumber).up()
        .ele('TaxYear').txt(String(header.taxYear)).up()
        .ele('GeneratedAt').txt(fmtDate(header.generatedAt)).up()
        .ele('EmployerTaxId').txt(pad9(header.employerTaxId)).up()
        .ele('EmployerName').txt(header.employerName).up()
        .ele('EmployerAddress').txt(header.employerAddress ?? '').up()
      .up()
      .ele('Summary126')
        .ele('EmployeesCount').txt(String(employees.length)).up()
        .ele('TotalGrossSalary').txt(String(sum(employees, 'grossSalaryAgorot'))).up()
        .ele('TotalTaxableSalary').txt(String(sum(employees, 'taxableSalaryAgorot'))).up()
        .ele('TotalIncomeTax').txt(String(sum(employees, 'incomeTaxAgorot'))).up()
        .ele('TotalNationalInsurance').txt(String(sum(employees, 'nationalInsuranceAgorot'))).up()
        .ele('TotalHealthInsurance').txt(String(sum(employees, 'healthInsuranceAgorot'))).up()
        .ele('TotalPensionEmployer').txt(String(sum(employees, 'pensionEmployerAgorot'))).up()
        .ele('TotalPensionEmployee').txt(String(sum(employees, 'pensionEmployeeAgorot'))).up()
        .ele('TotalStudyFundEmployer').txt(String(sum(employees, 'studyFundEmployerAgorot'))).up()
        .ele('TotalStudyFundEmployee').txt(String(sum(employees, 'studyFundEmployeeAgorot'))).up()
        .ele('TotalSeverance').txt(String(sum(employees, 'severanceAgorot'))).up()
      .up()
      .ele('Employees');

  for (const e of employees) {
    doc.ele('Employee126')
      .ele('TaxId').txt(pad9(e.taxId)).up()
      .ele('FullName').txt(e.fullName).up()
      .ele('GrossSalary').txt(String(e.grossSalaryAgorot)).up()
      .ele('IncomeTax').txt(String(e.incomeTaxAgorot)).up()
      .ele('NationalInsurance').txt(String(e.nationalInsuranceAgorot)).up()
      .up();
  }

  return doc.end({ prettyPrint: true });
}
