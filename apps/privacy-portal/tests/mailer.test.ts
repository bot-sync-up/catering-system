import { describe, expect, it } from "vitest";
import { buildVerifyUrl, sendEmail, _drainSentForTests } from "../src/lib/mailer";

describe("mailer", () => {
  it("שולח מייל ושומר אותו לבדיקות", async () => {
    _drainSentForTests();
    await sendEmail({ to: "x@y.co.il", subject: "Hi", body: "Hello" });
    const sent = _drainSentForTests();
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("x@y.co.il");
  });

  it("בונה URL לאימות עם encode", () => {
    process.env.PUBLIC_BASE_URL = "https://example.com";
    const url = buildVerifyUrl("/api/x/y", "tok+1/2");
    expect(url).toBe("https://example.com/api/x/y/tok%2B1%2F2");
  });
});
