import { describe, it, expect } from "vitest";
import { transformEmployee } from "../src/transformers/transformEmployee.js";
import type { HrEmployeeRow } from "../src/extractors/extractEmployeesFromHr.js";
import type { ExtractedRecord } from "../src/types.js";

const TENANT = "00000000-0000-0000-0000-000000000001";

function mkRec(partial: Partial<HrEmployeeRow> = {}): ExtractedRecord<HrEmployeeRow> {
  const payload: HrEmployeeRow = {
    id: "emp_1",
    employeeNum: "E-001",
    nationalId: "12345678",
    firstName: "משה",
    lastName: "כהן",
    position: "טבח ראשי",
    department: "מטבח",
    hireDate: new Date("2020-01-01"),
    terminationDate: null,
    monthlySalary: "15000.00",
    hourlyRate: null,
    status: "ACTIVE",
    email: "moshe@example.com",
    phone: "0521234567",
    createdAt: new Date("2020-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...partial,
  };
  return {
    payload,
    __meta: {
      sourceModule: "hr",
      sourceTable: "Employee",
      originalId: payload.id,
      extractedAt: new Date(),
      batchId: "test_batch",
    },
  };
}

describe("transformEmployee", () => {
  it("מנרמל ת.ז. ל־9 ספרות", () => {
    const out = transformEmployee(mkRec(), TENANT);
    expect(out.data.nationalId).toBe("012345678");
  });

  it("מזהיר על ת.ז. חסרה", () => {
    const out = transformEmployee(mkRec({ nationalId: null }), TENANT);
    expect(out.warnings.some((w) => w.includes("ת.ז."))).toBe(true);
  });

  it("ממיר משכורת ל־Decimal", () => {
    const out = transformEmployee(mkRec(), TENANT);
    expect(out.data.monthlySalary?.toString()).toBe("15000");
  });

  it("upsertKey ל־nationalId אם יש", () => {
    const out = transformEmployee(mkRec(), TENANT);
    expect(out.upsertKey).toEqual({ tenantId: TENANT, nationalId: "012345678" });
  });

  it("upsertKey נופל ל־employeeNum בלי ת.ז.", () => {
    const out = transformEmployee(mkRec({ nationalId: null }), TENANT);
    expect(out.upsertKey).toEqual({ tenantId: TENANT, employeeNum: "E-001" });
  });

  it("ממפה status", () => {
    expect(transformEmployee(mkRec({ status: "ON_LEAVE" }), TENANT).data.status).toBe("ON_LEAVE");
    expect(transformEmployee(mkRec({ status: "TERMINATED" }), TENANT).data.status).toBe("TERMINATED");
  });
});
