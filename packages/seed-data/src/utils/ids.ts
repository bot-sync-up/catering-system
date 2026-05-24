/**
 * עוזרי יצירת UUID דטרמיניסטיים — חוזרים על אותו seed מקבלים אותם IDs.
 * שימושי לבדיקות, רפרודקציה ו-FKs בין קבצים.
 */
import { randomUUID, createHash } from "node:crypto";

let seedCounter = 0;
let seedNamespace = "aneh-default";

export function setIdNamespace(namespace: string): void {
  seedNamespace = namespace;
  seedCounter = 0;
}

/** UUID v4 רגיל */
export function uuid(): string {
  return randomUUID();
}

/** UUID דטרמיניסטי לפי key (לקישורים יציבים בין קבצים) */
export function did(key: string): string {
  const hash = createHash("sha1").update(`${seedNamespace}:${key}`).digest("hex");
  // עיצוב כ-UUID v4
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    "4" + hash.slice(13, 16),
    "8" + hash.slice(17, 20),
    hash.slice(20, 32),
  ].join("-");
}

/** מזהה רץ ייחודי לפי קידומת */
export function nextId(prefix: string): string {
  return did(`${prefix}-${++seedCounter}`);
}
