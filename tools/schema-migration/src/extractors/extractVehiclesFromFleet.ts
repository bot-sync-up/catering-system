/**
 * Extractor: רכבים (Vehicle) — מהמודול הישן Fleet.
 */

import type { Pool } from "pg";
import { wrap, type Extractor } from "./base.js";
import type { ExtractedRecord } from "../types.js";

export interface FleetVehicleRow {
  id: string;
  plateNum: string;
  make: string | null;
  model: string | null;
  year: number | null;
  status: string;
  capacity: number | null;
  driverId: string | null;
  licenseExpiryDate: Date | null;
  insuranceExpiryDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class VehiclesFromFleetExtractor implements Extractor<FleetVehicleRow> {
  readonly sourceModule = "fleet" as const;
  readonly sourceTable = "Vehicle";
  readonly targetModelHint = "Vehicle";

  constructor(private readonly pool: Pool) {}

  async *extract(opts: { batchId: string; limit?: number }): AsyncIterable<ExtractedRecord<FleetVehicleRow>> {
    const sql = `
      SELECT id, "plateNum", make, model, year, status::text AS status,
             capacity, "driverId", "licenseExpiryDate", "insuranceExpiryDate",
             "createdAt", "updatedAt"
      FROM "Vehicle"
      ORDER BY "createdAt" ASC
      ${opts.limit ? `LIMIT ${opts.limit}` : ""}
    `;
    const result = await this.pool.query(sql);
    for (const raw of result.rows as FleetVehicleRow[]) {
      yield wrap(raw, {
        sourceModule: this.sourceModule,
        sourceTable: this.sourceTable,
        originalId: raw.id,
        batchId: opts.batchId,
      });
    }
  }
}
