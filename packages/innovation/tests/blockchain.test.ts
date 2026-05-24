import { describe, it, expect } from "vitest";
import { ContractRegistry, sha256Hex } from "../src/blockchain/ContractRegistry.js";
import { AuditTrail } from "../src/blockchain/AuditTrail.js";
import { IPFSStubClient } from "../src/blockchain/ipfs-stub.js";

describe("ContractRegistry", () => {
  it("עוגן ומאמת חוזה", async () => {
    const reg = new ContractRegistry();
    const doc = "חוזה לקייטרינג חתונה 25/05/2026";
    const record = await reg.anchorContract("C-1", doc, "moshe");
    expect(record.hash).toBe(sha256Hex(doc));
    expect(await reg.verifyContract("C-1", doc)).toBe(true);
    expect(await reg.verifyContract("C-1", doc + " (שונה)")).toBe(false);
  });
});

describe("AuditTrail Merkle", () => {
  it("מחזיר הוכחת הכלה תקפה", () => {
    const t = new AuditTrail();
    for (let i = 0; i < 8; i++) {
      t.append({ id: `E${i}`, occurredAt: i * 1000, payload: { x: i } });
    }
    const proof = t.proofFor(3);
    expect(AuditTrail.verifyProof(proof)).toBe(true);
    // ההוכחה צריכה לכוון לאותו שורש כמו computeRoot
    expect(proof.root).toBe(t.computeRoot());
  });

  it("דוחה הוכחה מזוייפת", () => {
    const t = new AuditTrail();
    t.append({ id: "A", occurredAt: 1, payload: {} });
    t.append({ id: "B", occurredAt: 2, payload: {} });
    const proof = t.proofFor(0);
    const tampered = { ...proof, leaf: "0".repeat(64) };
    expect(AuditTrail.verifyProof(tampered)).toBe(false);
  });
});

describe("IPFSStubClient", () => {
  it("שומר ומחזיר תוכן לפי CID", async () => {
    const c = new IPFSStubClient();
    const { cid } = await c.add("hello");
    expect((await c.get(cid))!.toString("utf-8")).toBe("hello");
    await c.pin(cid);
    expect(c.isPinned(cid)).toBe(true);
  });
});
