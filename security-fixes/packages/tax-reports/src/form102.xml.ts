/**
 * טופס 102 — ניכויים חודשיים ממשכורת (פורמט Mai101)
 * ---------------------------------------------------------------
 * דיווח חודשי לרשות המסים על ניכויים — מס הכנסה,
 * ביטוח לאומי, מס בריאות.
 */

import { create } from 'xmlbuilder2';

export interface Form102Header {
  reportingMonth: number;   // 1-12
  reportingYear: number;    // 2025
  employerTaxId: string;
  employerName: string;
  generatedAt: Date;
  controlNumber: string;
}

export interface Form102Summary {
  totalGrossAgorot: number;
  totalIncomeTaxAgorot: number;
  totalNationalInsuranceAgorot: number;
  totalHealthInsuranceAgorot: number;
  employeesCount: number;
  /** אגורות ששולמו לרשות המסים */
  paidAmountAgorot: number;
  /** מספר שובר תשלום */
  paymentVoucherNumber?: string;
}

function pad9(id: string): string {
  return id.replace(/\D/g, '').padStart(9, '0');
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

export function generateForm102Xml(header: Form102Header, summary: Form102Summary): string {
  const doc = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('Mai101', { Format: '102', Version: '2025.1' })
      .ele('Header')
        .ele('ControlNumber').txt(header.controlNumber).up()
        .ele('ReportingMonth').txt(String(header.reportingMonth).padStart(2, '0')).up()
        .ele('ReportingYear').txt(String(header.reportingYear)).up()
        .ele('GeneratedAt').txt(fmtDate(header.generatedAt)).up()
        .ele('EmployerTaxId').txt(pad9(header.employerTaxId)).up()
        .ele('EmployerName').txt(header.employerName).up()
      .up()
      .ele('Summary102')
        .ele('TotalGross').txt(String(summary.totalGrossAgorot)).up()
        .ele('TotalIncomeTax').txt(String(summary.totalIncomeTaxAgorot)).up()
        .ele('TotalNationalInsurance').txt(String(summary.totalNationalInsuranceAgorot)).up()
        .ele('TotalHealthInsurance').txt(String(summary.totalHealthInsuranceAgorot)).up()
        .ele('EmployeesCount').txt(String(summary.employeesCount)).up()
        .ele('PaidAmount').txt(String(summary.paidAmountAgorot)).up()
        .ele('PaymentVoucherNumber').txt(summary.paymentVoucherNumber ?? '').up()
      .up();

  return doc.end({ prettyPrint: true });
}
