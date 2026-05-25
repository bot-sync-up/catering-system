/**
 * חישוב נתיבים ארגוניים לקבצי הדיווח:
 * <base>/<businessTaxId>/<year>/<month?>/<formType>/<fileName>
 */
import { BusinessIdentity, ReportFormType, ReportPeriod } from '../types';

export function buildReportDir(
  basePath: string,
  business: BusinessIdentity,
  period: ReportPeriod,
  formType: ReportFormType,
): string {
  const monthSeg = period.month ? String(period.month).padStart(2, '0') : 'annual';
  return [basePath, business.taxId, String(period.year), monthSeg, formType].join('/');
}

export function buildFileName(formType: ReportFormType, period: ReportPeriod, ext: string): string {
  const monthSuffix = period.month ? `-${String(period.month).padStart(2, '0')}` : '';
  return `${formType}-${period.year}${monthSuffix}.${ext}`;
}

export function buildFullPath(
  basePath: string,
  business: BusinessIdentity,
  period: ReportPeriod,
  formType: ReportFormType,
  ext: string,
): string {
  return `${buildReportDir(basePath, business, period, formType)}/${buildFileName(formType, period, ext)}`;
}
