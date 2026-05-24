/**
 * בדיקה שה-SAR builder מייצר ZIP עם כל קבצי המודולים.
 * משתמש ב-mock של prisma + audit + תיקיית artifacts זמנית.
 */
import { describe, expect, it, vi } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFile, mkdtemp } from "node:fs/promises";
import JSZip from "jszip";

const tmpRoot = await mkdtemp(join(tmpdir(), "sar-test-"));
process.env.ARTIFACTS_DIR = tmpRoot;

vi.mock("../src/lib/db", () => {
  const state = {
    sar: {
      id: "sar1",
      userId: "u1",
      user: { id: "u1", email: "u1@example.co.il" },
    },
    updates: [] as unknown[],
  };
  return {
    prisma: {
      sarRequest: {
        findUnique: vi.fn(async () => state.sar),
        update: vi.fn(async (arg: { data: unknown }) => {
          state.updates.push(arg.data);
          return state.sar;
        }),
      },
    },
    __state: state,
  };
});

vi.mock("../src/lib/queue", () => ({
  getRedisConnection: vi.fn(),
  SAR_QUEUE: "test",
}));

vi.mock("../src/lib/audit", () => ({
  audit: vi.fn(async () => undefined),
}));

import { processSarJob } from "../src/workers/sarBuilder";

describe("processSarJob", () => {
  it("בונה ZIP עם crm/orders/invoices/payments/events + summary.pdf", async () => {
    const r = await processSarJob({ sarRequestId: "sar1" });
    expect(r.artifactPath).toContain("sar1.zip");

    const buf = await readFile(r.artifactPath);
    const zip = await JSZip.loadAsync(buf);
    const names = Object.keys(zip.files).sort();
    expect(names).toContain("crm.json");
    expect(names).toContain("orders.json");
    expect(names).toContain("invoices.json");
    expect(names).toContain("payments.json");
    expect(names).toContain("events.json");
    expect(names).toContain("summary.pdf");
    expect(names).toContain("README.txt");

    const crmFile = await zip.file("crm.json")!.async("string");
    const crm = JSON.parse(crmFile);
    expect(crm.userId).toBe("u1");
  }, 20_000);
});
