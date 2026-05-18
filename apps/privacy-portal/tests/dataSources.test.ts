import { describe, expect, it } from "vitest";
import { fetchAllModules, fetchInvoices } from "../src/lib/mocks/dataSources";

describe("mock dataSources", () => {
  it("fetchAllModules מחזיר את חמשת המודולים", async () => {
    const m = await fetchAllModules("user_test");
    expect(m).toHaveProperty("crm");
    expect(m).toHaveProperty("orders");
    expect(m).toHaveProperty("invoices");
    expect(m).toHaveProperty("payments");
    expect(m).toHaveProperty("events");
  });

  it("חשבונית מחויבת בשמירה של 7 שנים", async () => {
    const inv = await fetchInvoices("user_x");
    expect(inv[0].legalRetentionUntil).toBeDefined();
    const until = new Date(inv[0].legalRetentionUntil);
    const issued = new Date(inv[0].createdAt);
    const years = (until.getTime() - issued.getTime()) / (365 * 24 * 60 * 60 * 1000);
    expect(years).toBeGreaterThanOrEqual(6.9);
  });

  it("payment לא חושף PAN מלא — רק 4 ספרות אחרונות", async () => {
    const m = await fetchAllModules("u1");
    for (const p of m.payments) {
      expect(p.last4).toMatch(/^\d{4}$/);
      // ודא שאין שדה pan
      expect(p).not.toHaveProperty("pan");
    }
  });
});
