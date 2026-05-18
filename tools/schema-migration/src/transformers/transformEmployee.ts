/**
 * Transformer: Employee (HR ישן) → Employee חדש.
 *
 * שינויים:
 *   - nationalId מנורמל ל־9 ספרות.
 *   - monthlySalary/hourlyRate: Decimal(14,2) → Decimal(12,2).
 *   - email/phone מנורמלים.
 */

import type { TransformedRecord, ExtractedRecord } from "../types.js";
import type { HrEmployeeRow } from "../extractors/extractEmployeesFromHr.js";
import {
  deterministicUuid,
  normalizeEmail,
  normalizeNationalId,
  normalizePhone,
  toDate,
  toMoneyDecimal,
} from "../util/normalize.js";
import { Decimal } from "decimal.js";

const employmentStatusMap: Record<string, string> = {
  ACTIVE: "ACTIVE",
  ON_LEAVE: "ON_LEAVE",
  TERMINATED: "TERMINATED",
  SUSPENDED: "SUSPENDED",
  PROBATION: "PROBATION",
};

export interface NewEmployeeData {
  id: string;
  tenantId: string;
  employeeNum: string;
  nationalId: string | null;
  firstName: string;
  lastName: string;
  position: string | null;
  department: string | null;
  hireDate: Date;
  terminationDate: Date | null;
  monthlySalary: Decimal | null;
  hourlyRate: Decimal | null;
  status: string;
  email: string | null;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
  _migrationSource: string;
  _migrationBatchId: string;
}

export function transformEmployee(
  rec: ExtractedRecord<HrEmployeeRow>,
  tenantId: string,
): TransformedRecord<NewEmployeeData> {
  const p = rec.payload;
  const warnings: string[] = [];
  const newId = deterministicUuid(rec.__meta.sourceModule, p.id);

  const status = employmentStatusMap[p.status];
  if (!status) warnings.push(`EmploymentStatus לא ידוע: ${p.status} → ACTIVE`);

  if (!p.nationalId) warnings.push("עובד ללא ת.ז. — דרוש להשלמה ידנית");

  const data: NewEmployeeData = {
    id: newId,
    tenantId,
    employeeNum: p.employeeNum,
    nationalId: normalizeNationalId(p.nationalId),
    firstName: p.firstName?.trim() || "",
    lastName: p.lastName?.trim() || "",
    position: p.position,
    department: p.department,
    hireDate: toDate(p.hireDate) ?? new Date(),
    terminationDate: toDate(p.terminationDate),
    monthlySalary: toMoneyDecimal(p.monthlySalary),
    hourlyRate: toMoneyDecimal(p.hourlyRate),
    status: status ?? "ACTIVE",
    email: normalizeEmail(p.email),
    phone: normalizePhone(p.phone),
    createdAt: toDate(p.createdAt) ?? new Date(),
    updatedAt: toDate(p.updatedAt) ?? new Date(),
    _migrationSource: `${rec.__meta.sourceModule}::${rec.__meta.originalId}`,
    _migrationBatchId: rec.__meta.batchId,
  };

  return {
    __meta: rec.__meta,
    targetModel: "Employee",
    newId,
    data,
    upsertKey: data.nationalId
      ? { tenantId, nationalId: data.nationalId }
      : { tenantId, employeeNum: data.employeeNum },
    warnings,
  };
}

/** עזר חיצוני ל־transformer של Expense (משתמש בו). */
export { Decimal };
