/**
 * Dedup: זיהוי לקוחות זהים שעלולים להגיע ממקורות שונים.
 *
 * אלגוריתם:
 * 1) match חזק: זוג (taxId זהה) — אם שניהם קיימים → אותו לקוח.
 * 2) match חזק: זוג (email זהה ולא ריק) → אותו לקוח.
 * 3) match חזק: זוג (phone זהה ולא ריק) → אותו לקוח.
 * 4) match רך: שם דומה (Levenshtein ≤ 2 על displayName מנורמל) + אחת מ:
 *    אותו tenant, אותה עיר/כתובת.
 *
 * החזרה: מערך של "קבוצות שכפול" — כל קבוצה היא lista של ids ולקוח canonical.
 */

import levenshtein from "fast-levenshtein";
import type { NewCustomerData } from "../transformers/transformCustomer.js";

export interface DuplicateGroup {
  canonicalId: string;
  duplicateIds: string[];
  reason: string;
  confidence: "high" | "medium" | "low";
}

export interface DedupOptions {
  /** סף Levenshtein לשם — ברירת מחדל 2. */
  nameThreshold?: number;
  /** האם להפעיל fuzzy על שם. */
  enableFuzzyName?: boolean;
}

/** מחזיר קבוצות שכפול עבור רשימת לקוחות שעברו transform. */
export function dedupCustomers(
  customers: NewCustomerData[],
  options: DedupOptions = {},
): DuplicateGroup[] {
  const { nameThreshold = 2, enableFuzzyName = true } = options;
  const groups: DuplicateGroup[] = [];
  const claimed = new Set<string>();

  // אינדקסים מהירים לפי מפתחות חזקים.
  const byTaxId = new Map<string, NewCustomerData[]>();
  const byEmail = new Map<string, NewCustomerData[]>();
  const byPhone = new Map<string, NewCustomerData[]>();

  for (const c of customers) {
    if (c.taxId) push(byTaxId, c.taxId, c);
    if (c.email) push(byEmail, c.email.toLowerCase(), c);
    if (c.phone) push(byPhone, c.phone, c);
  }

  // 1+2+3 — מפתחות חזקים.
  for (const [key, list] of byTaxId) {
    if (list.length < 2) continue;
    addGroup(groups, list, claimed, `taxId זהה: ${key}`, "high");
  }
  for (const [key, list] of byEmail) {
    if (list.length < 2) continue;
    addGroup(groups, list, claimed, `email זהה: ${key}`, "high");
  }
  for (const [key, list] of byPhone) {
    if (list.length < 2) continue;
    addGroup(groups, list, claimed, `phone זהה: ${key}`, "high");
  }

  // 4 — fuzzy name.
  if (enableFuzzyName) {
    const remaining = customers.filter((c) => !claimed.has(c.id));
    for (let i = 0; i < remaining.length; i++) {
      const a = remaining[i];
      if (!a || claimed.has(a.id)) continue;
      const aName = normalizeName(a.displayName);
      const aKey = `${a.tenantId}|${aName}`;
      const matches: NewCustomerData[] = [a];
      for (let j = i + 1; j < remaining.length; j++) {
        const b = remaining[j];
        if (!b || claimed.has(b.id)) continue;
        if (b.tenantId !== a.tenantId) continue;
        const bName = normalizeName(b.displayName);
        const dist = levenshtein.get(aName, bName);
        if (dist <= nameThreshold) {
          matches.push(b);
        }
      }
      if (matches.length >= 2) {
        addGroup(groups, matches, claimed, `שם דומה (Levenshtein≤${nameThreshold}): ${aKey}`, "medium");
      }
    }
  }

  return groups;
}

function push<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const arr = map.get(key);
  if (arr) arr.push(value);
  else map.set(key, [value]);
}

function addGroup(
  groups: DuplicateGroup[],
  customers: NewCustomerData[],
  claimed: Set<string>,
  reason: string,
  confidence: "high" | "medium" | "low",
): void {
  // canonical = הכי הרבה נתונים מלאים → fallback ל־createdAt הכי ישן.
  const canonical = customers
    .slice()
    .sort((a, b) => scoreCompleteness(b) - scoreCompleteness(a) || a.createdAt.getTime() - b.createdAt.getTime())[0];
  if (!canonical) return;
  const duplicates = customers.filter((c) => c.id !== canonical.id);
  groups.push({
    canonicalId: canonical.id,
    duplicateIds: duplicates.map((c) => c.id),
    reason,
    confidence,
  });
  for (const c of customers) claimed.add(c.id);
}

function scoreCompleteness(c: NewCustomerData): number {
  let score = 0;
  if (c.taxId) score += 3;
  if (c.email) score += 2;
  if (c.phone) score += 2;
  if (c.companyName) score += 1;
  if (c.website) score += 1;
  if (c.notes) score += 1;
  return score;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[֐-׿ -/:-@[-`{-~]+/g, " ")
    .replace(/\s+/g, " ");
}
