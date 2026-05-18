import { describe, expect, it } from "vitest";
import { defaultSarExpiry, mintToken, verifyTokenShape } from "../src/lib/tokens";

describe("tokens", () => {
  it("מייצר טוקן חתום ייחודי", () => {
    const a = mintToken("sar-verify");
    const b = mintToken("sar-verify");
    expect(a).not.toBe(b);
    expect(a.split(".")).toHaveLength(2);
  });

  it("מאמת חתימה תקינה", () => {
    const t = mintToken("sar-download");
    expect(verifyTokenShape(t, "sar-download")).toBe(true);
  });

  it("דוחה חתימה למטרה אחרת", () => {
    const t = mintToken("erasure-approve");
    expect(verifyTokenShape(t, "sar-download")).toBe(false);
  });

  it("דוחה טוקן מעוות", () => {
    expect(verifyTokenShape("invalid-token", "sar-verify")).toBe(false);
    expect(verifyTokenShape("abc.def.ghi", "sar-verify")).toBe(false);
  });

  it("תוקף ברירת מחדל הוא 30 ימים בקירוב", () => {
    const exp = defaultSarExpiry();
    const diff = exp.getTime() - Date.now();
    expect(diff).toBeGreaterThan(29 * 24 * 60 * 60 * 1000);
    expect(diff).toBeLessThan(31 * 24 * 60 * 60 * 1000);
  });
});
