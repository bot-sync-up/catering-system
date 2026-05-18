import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { writeHtmlDiffReport } from "../src/diff/htmlReport.js";

describe("writeHtmlDiffReport", () => {
  it("מייצר HTML עם RTL ותוכן עברית", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "migration-test-"));
    const out = path.join(tmp, "report.html");
    await writeHtmlDiffReport(
      {
        batchId: "batch_test",
        startedAt: "2026-05-17T10:00:00.000Z",
        finishedAt: "2026-05-17T10:05:00.000Z",
        beforeCounts: { customers: 100 },
        afterCounts: { customers: 150 },
        countMatches: [
          {
            sourceModule: "crm",
            sourceTable: "Customer",
            targetModel: "Customer",
            sourceCount: 150,
            targetCount: 150,
            ok: true,
            diff: 0,
          },
        ],
        integrityIssues: [
          {
            check: "FK invoices.customer_id",
            table: "invoices",
            ids: ["id1", "id2"],
            message: "2 חשבוניות ללא לקוח קיים",
          },
        ],
        errors: [],
      },
      out,
    );
    const content = await fs.readFile(out, "utf-8");
    expect(content).toContain('dir="rtl"');
    expect(content).toContain("דו"ח מיגרציה");
    expect(content).toContain("batch_test");
    expect(content).toContain("FK invoices.customer_id");
  });

  it("מציג +50 בצבע ירוק בשורת delta", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "migration-test-"));
    const out = path.join(tmp, "report.html");
    await writeHtmlDiffReport(
      {
        batchId: "b",
        startedAt: "",
        finishedAt: "",
        beforeCounts: { customers: 100 },
        afterCounts: { customers: 150 },
        countMatches: [],
        integrityIssues: [],
        errors: [],
      },
      out,
    );
    const content = await fs.readFile(out, "utf-8");
    expect(content).toMatch(/\+50/);
  });

  it("ESCAPE לתוכן שעלול לפרוץ HTML", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "migration-test-"));
    const out = path.join(tmp, "report.html");
    await writeHtmlDiffReport(
      {
        batchId: "<script>x</script>",
        startedAt: "",
        finishedAt: "",
        beforeCounts: {},
        afterCounts: {},
        countMatches: [],
        integrityIssues: [],
        errors: [{ sourceModule: "x", originalId: "y", targetModel: "z", message: "<bad>" }],
      },
      out,
    );
    const content = await fs.readFile(out, "utf-8");
    expect(content).not.toContain("<script>x</script>");
    expect(content).toContain("&lt;script&gt;");
    expect(content).toContain("&lt;bad&gt;");
  });
});
