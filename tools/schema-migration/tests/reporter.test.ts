import { describe, it, expect } from "vitest";
import { Reporter } from "../src/util/reporter.js";
import type { MigrationConfig } from "../src/types.js";

const cfg: MigrationConfig = {
  source: "all",
  targetTenantId: "00000000-0000-0000-0000-000000000001",
  dryRun: false,
  continueOnError: true,
  batchId: "batch_test",
  targetDatabaseUrl: "postgres://localhost/test",
  sourceDatabaseUrls: {},
  verbose: false,
};

describe("Reporter", () => {
  it("צובר ספירות לפי מודל", () => {
    const r = new Reporter(cfg);
    r.startModel("Customer");
    r.incExtracted("Customer", 10);
    r.incTransformed("Customer", 9);
    r.incLoaded("Customer", {
      __meta: { sourceModule: "crm", sourceTable: "Customer", originalId: "x", extractedAt: new Date(), batchId: "b" },
      targetModel: "Customer",
      newId: "u",
      action: "inserted",
    });
    r.endModel("Customer");
    const built = r.build();
    expect(built.perModel.Customer?.extracted).toBe(10);
    expect(built.perModel.Customer?.transformed).toBe(9);
    expect(built.perModel.Customer?.loaded).toBe(1);
    expect(built.totals.extracted).toBe(10);
  });

  it("צובר שגיאות", () => {
    const r = new Reporter(cfg);
    r.recordError({
      model: "Invoice",
      sourceModule: "finance-docs",
      originalId: "abc",
      error: new Error("שגיאה לדוגמה"),
    });
    const built = r.build();
    expect(built.errors).toHaveLength(1);
    expect(built.errors[0]?.message).toBe("שגיאה לדוגמה");
    expect(built.totals.errors).toBe(1);
  });

  it("המידע הרגיש (URLs) לא נכלל ב־report", () => {
    const r = new Reporter(cfg);
    const built = r.build();
    expect((built.config as unknown as { targetDatabaseUrl?: string }).targetDatabaseUrl).toBeUndefined();
    expect((built.config as unknown as { sourceDatabaseUrls?: unknown }).sourceDatabaseUrls).toBeUndefined();
  });
});
