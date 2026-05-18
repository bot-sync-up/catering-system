/**
 * Drill-down API — שאילתות הצללה לתוך KPI cards
 *
 * POST /api/bi/drilldown
 *   body: {
 *     tenantId, from, to,
 *     dimension: "customer" | "agent" | "eventType" | "event" | "category",
 *     metric: "revenue" | "cogs" | "profitability" | "aging" | "ltv"
 *   }
 *
 * מחזיר מערך BreakdownRow / EventProfitability / AgingReport / CustomerLtvRow
 * תלוי במטריקה.
 */
import { z } from "zod";
import {
  breakdownByAgent,
  breakdownByCustomer,
  breakdownByEventType,
} from "../aggregations/breakdowns.js";
import { buildCogsPerEvent } from "../aggregations/cogs-per-event.js";
import { buildAgingReport } from "../aggregations/aging.js";
import { buildCustomerLtv } from "../aggregations/customer-ltv.js";

export const DrillDownSchema = z.object({
  tenantId: z.string().uuid(),
  from: z.coerce.date(),
  to: z.coerce.date(),
  dimension: z.enum(["customer", "agent", "eventType", "event", "category"]),
  metric: z.enum(["revenue", "cogs", "profitability", "aging", "ltv"]),
});
export type DrillDownRequest = z.infer<typeof DrillDownSchema>;

export interface DrillDownResponse {
  request: DrillDownRequest;
  rows: unknown[];
  generatedAt: string;
}

export async function drillDown(raw: unknown): Promise<DrillDownResponse> {
  const req = DrillDownSchema.parse(raw);
  const range = { from: req.from, to: req.to };

  let rows: unknown[] = [];

  if (req.metric === "aging") {
    const report = await buildAgingReport({ tenantId: req.tenantId });
    rows = report.byCustomer;
  } else if (req.metric === "ltv") {
    rows = await buildCustomerLtv({ tenantId: req.tenantId, range });
  } else if (req.metric === "profitability" || req.dimension === "event") {
    rows = await buildCogsPerEvent({ tenantId: req.tenantId, range });
  } else if (req.metric === "revenue") {
    switch (req.dimension) {
      case "customer":
        rows = await breakdownByCustomer({ tenantId: req.tenantId, range });
        break;
      case "agent":
        rows = await breakdownByAgent({ tenantId: req.tenantId, range });
        break;
      case "eventType":
      case "category":
        rows = await breakdownByEventType({ tenantId: req.tenantId, range });
        break;
      default:
        rows = [];
    }
  } else if (req.metric === "cogs" && req.dimension === "event") {
    rows = await buildCogsPerEvent({ tenantId: req.tenantId, range });
  }

  return {
    request: req,
    rows,
    generatedAt: new Date().toISOString(),
  };
}
