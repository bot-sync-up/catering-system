import { describe, expect, it } from "vitest";
import { z } from "zod";
import { errorResponse, parseJson, readClientHints } from "../src/lib/http";

function makeReq(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("https://example.com/x", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("http helpers", () => {
  it("parseJson — מצליח על JSON תקין", async () => {
    const req = makeReq({ email: "a@b.co.il" });
    const r = await parseJson(req, z.object({ email: z.string().email() }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.email).toBe("a@b.co.il");
  });

  it("parseJson — נכשל ב-validation עם 422", async () => {
    const req = makeReq({ email: "not-email" });
    const r = await parseJson(req, z.object({ email: z.string().email() }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(422);
  });

  it("parseJson — מחזיר 400 לגוף לא תקין", async () => {
    const req = makeReq("not-json{");
    const r = await parseJson(req, z.object({}));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(400);
  });

  it("readClientHints — מוציא IP מ-x-forwarded-for", () => {
    const req = makeReq({}, { "x-forwarded-for": "1.2.3.4, 5.6.7.8", "user-agent": "vitest" });
    const h = readClientHints(req);
    expect(h.ipAddress).toBe("1.2.3.4");
    expect(h.userAgent).toBe("vitest");
  });

  it("errorResponse — מחזיר את הקוד שביקשנו", async () => {
    const r = errorResponse("X", "msg", 418);
    expect(r.status).toBe(418);
    const j = await r.json();
    expect(j.error).toBe("X");
  });
});
