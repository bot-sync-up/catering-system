import { describe, it, expect } from "vitest";
import { QRGenerator, parseShortCode } from "../src/qr/QRGenerator.js";

describe("QRGenerator", () => {
  it("מייצר קוד עם prefix נכון לכל סוג", async () => {
    const g = new QRGenerator();
    const order = await g.forOrder("ORD-1");
    const invoice = await g.forInvoice("INV-1");
    const employee = await g.forEmployee("EMP-1");
    expect(order.shortCode.startsWith("o")).toBe(true);
    expect(invoice.shortCode.startsWith("i")).toBe(true);
    expect(employee.shortCode.startsWith("u")).toBe(true);
  });

  it("מחזיר data URL של PNG", async () => {
    const g = new QRGenerator();
    const qr = await g.forOrder("ORD-99");
    expect(qr.dataUrl.startsWith("data:image/png;base64,")).toBe(true);
  });

  it("buildShortUrl משתמש בדומיין שניתן", () => {
    const g = new QRGenerator({ shortDomain: "sx.example.com" });
    expect(g.buildShortUrl("oABC123")).toBe("https://sx.example.com/oABC123");
  });

  it("parseShortCode מזהה נושא", () => {
    expect(parseShortCode("oABC").subject).toBe("order");
    expect(parseShortCode("dXYZ").subject).toBe("delivery");
    expect(parseShortCode("zZZZ").subject).toBe(null);
  });
});
