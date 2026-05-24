import { describe, it, expect } from "vitest";
import { InMemoryPasskeyStore, PasskeyManager } from "../src/passkeys/PasskeyManager.js";

describe("PasskeyManager - recovery codes", () => {
  it("יוצר 10 קודים בפורמט XXXX-XXXX-XXXX", async () => {
    const mgr = new PasskeyManager({
      rpId: "test.local",
      rpName: "Test",
      expectedOrigins: ["https://test.local"],
      store: new InMemoryPasskeyStore(),
    });
    const codes = await mgr.generateRecoveryCodes("user-1");
    expect(codes).toHaveLength(10);
    for (const c of codes) {
      expect(c).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    }
  });

  it("ניתן לצרוך קוד פעם אחת בלבד", async () => {
    const mgr = new PasskeyManager({
      rpId: "test.local",
      rpName: "Test",
      expectedOrigins: ["https://test.local"],
      store: new InMemoryPasskeyStore(),
    });
    const codes = await mgr.generateRecoveryCodes("user-2", 1);
    const first = await mgr.useRecoveryCode("user-2", codes[0]);
    const second = await mgr.useRecoveryCode("user-2", codes[0]);
    expect(first).toBe(true);
    expect(second).toBe(false);
  });

  it("דחיית קוד שגוי", async () => {
    const mgr = new PasskeyManager({
      rpId: "test.local",
      rpName: "Test",
      expectedOrigins: ["https://test.local"],
      store: new InMemoryPasskeyStore(),
    });
    await mgr.generateRecoveryCodes("user-3", 1);
    const ok = await mgr.useRecoveryCode("user-3", "WRON-GCOD-ENOT");
    expect(ok).toBe(false);
  });
});
