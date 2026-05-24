// AES-256-GCM Field-level Encryption
// משמש להצפנת שדות רגישים: bank, taxId, salary, pensionFund
import crypto from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY חייב להיות 64 תווי HEX (32 בתים) להצפנת AES-256-GCM"
    );
  }
  return Buffer.from(hex, "hex");
}

/** מצפין מחרוזת ומחזיר base64 של iv|tag|ciphertext */
export function encryptField(plain: string | null | undefined): string | null {
  if (plain == null || plain === "") return null;
  const key = getKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

/** מפענח מחרוזת base64 (iv|tag|ciphertext) ומחזיר את הטקסט המקורי */
export function decryptField(encB64: string | null | undefined): string | null {
  if (!encB64) return null;
  const key = getKey();
  const buf = Buffer.from(encB64, "base64");
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const data = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString("utf8");
}

/** מצפין אובייקט (לשמירת bank כ-JSON מוצפן) */
export function encryptJson(obj: unknown): string | null {
  if (obj == null) return null;
  return encryptField(JSON.stringify(obj));
}

export function decryptJson<T = unknown>(encB64: string | null | undefined): T | null {
  const dec = decryptField(encB64);
  return dec ? (JSON.parse(dec) as T) : null;
}
