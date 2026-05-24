/**
 * Extractor: עובדים (Employee) — מהמודול הישן `agent-abcfc839a28d7b588/packages/db`.
 *
 * הסכמה הישנה (HR):
 *   model Employee { id, employeeNum, nationalId, firstName, lastName,
 *     position, department, hireDate, terminationDate?,
 *     monthlySalary?, hourlyRate?, status, ... }
 *
 * שכר מועבר ל־Decimal(12,2). ת.ז. מנורמלת ל־9 ספרות.
 */

import type { Pool } from "pg";
import { wrap, type Extractor } from "./base.js";
import type { ExtractedRecord } from "../types.js";

export interface HrEmployeeRow {
  id: string;
  employeeNum: string;
  nationalId: string | null;
  firstName: string;
  lastName: string;
  position: string | null;
  department: string | null;
  hireDate: Date;
  terminationDate: Date | null;
  monthlySalary: string | null;
  hourlyRate: string | null;
  status: string;
  email: string | null;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class EmployeesFromHrExtractor implements Extractor<HrEmployeeRow> {
  readonly sourceModule = "hr" as const;
  readonly sourceTable = "Employee";
  readonly targetModelHint = "Employee";

  constructor(private readonly pool: Pool) {}

  async *extract(opts: { batchId: string; limit?: number }): AsyncIterable<ExtractedRecord<HrEmployeeRow>> {
    const sql = `
      SELECT id, "employeeNum", "nationalId", "firstName", "lastName",
             position, department, "hireDate", "terminationDate",
             "monthlySalary"::text AS "monthlySalary",
             "hourlyRate"::text AS "hourlyRate",
             status::text AS status, email, phone, "createdAt", "updatedAt"
      FROM "Employee"
      ORDER BY "hireDate" ASC
      ${opts.limit ? `LIMIT ${opts.limit}` : ""}
    `;
    const result = await this.pool.query(sql);
    for (const raw of result.rows as HrEmployeeRow[]) {
      yield wrap(raw, {
        sourceModule: this.sourceModule,
        sourceTable: this.sourceTable,
        originalId: raw.id,
        batchId: opts.batchId,
      });
    }
  }
}
