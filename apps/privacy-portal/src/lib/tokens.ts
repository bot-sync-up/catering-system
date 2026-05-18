import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const SECRET = process.env.TOKEN_SECRET ?? "dev-only-secret-change-me-32bytes";

/**
 * מפיק טוקן בטוח לאימייל אימות / קישור הורדה.
 * פורמט: <random>.<sig> — חתום ב-HMAC כדי שלא נוכל לזייף אותו ללא ה-DB.
 */
export function mintToken(purpose: string): string {
  const raw = randomBytes(24).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(`${purpose}:${raw}`).digest("base64url").slice(0, 16);
  return `${raw}.${sig}`;
}

export function verifyTokenShape(token: string, purpose: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [raw, sig] = parts;
  const expected = createHmac("sha256", SECRET).update(`${purpose}:${raw}`).digest("base64url").slice(0, 16);
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

/** תוקף ברירת מחדל לקישורי SAR — 30 ימים (חוק קובע "תוך זמן סביר") */
export function defaultSarExpiry(): Date {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
}
