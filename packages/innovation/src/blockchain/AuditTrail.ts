/**
 * AuditTrail — שרשרת אירועים עם Merkle Root.
 *
 * עבור כל אירוע במערכת (Order placed / Invoice signed / Payment received) אנו
 * שומרים hash. בכל קומיט (סיום יום / שעה) מחושב Merkle Root של כל ההאשים
 * שנאספו, וניתן לעגן אותו ב-`ContractRegistry`.
 *
 * המבנה תומך הוכחות הכלה (Merkle proof) עבור כל אירוע יחיד — אבן יסוד
 * לאודיט בלתי תלוי.
 */

import { createHash } from "node:crypto";

export interface AuditEvent {
  id: string;
  occurredAt: number;
  /** payload כלשהו — JSON-serializable. */
  payload: unknown;
}

export interface MerkleProof {
  /** ההאש של האירוע עצמו (עלה). */
  leaf: string;
  /** רשימת קודקודים אחיים בדרך לשורש. */
  siblings: Array<{ hash: string; position: "left" | "right" }>;
  /** השורש שאליו ההוכחה מובילה. */
  root: string;
}

export class AuditTrail {
  private leaves: string[] = [];
  private events: AuditEvent[] = [];

  /** מוסיף אירוע ומחזיר את ה-hash שלו. */
  append(event: AuditEvent): string {
    const leaf = hashEvent(event);
    this.events.push(event);
    this.leaves.push(leaf);
    return leaf;
  }

  size(): number {
    return this.leaves.length;
  }

  /** מחשב Merkle Root. אם רק עלה אחד — הוא עצמו. אם 0 — שורש "אפס". */
  computeRoot(): string {
    if (this.leaves.length === 0) return "0".repeat(64);
    let layer = [...this.leaves];
    while (layer.length > 1) {
      const next: string[] = [];
      for (let i = 0; i < layer.length; i += 2) {
        const left = layer[i];
        const right = layer[i + 1] ?? left; // duplicate last if odd
        next.push(sha256Hex(left + right));
      }
      layer = next;
    }
    return layer[0];
  }

  /** מחזיר Merkle proof עבור אירוע באינדקס. */
  proofFor(index: number): MerkleProof {
    if (index < 0 || index >= this.leaves.length) {
      throw new Error("INDEX_OUT_OF_RANGE");
    }
    const siblings: MerkleProof["siblings"] = [];
    let layer = [...this.leaves];
    let idx = index;
    while (layer.length > 1) {
      const isRight = idx % 2 === 1;
      const siblingIdx = isRight ? idx - 1 : idx + 1;
      const sibling = layer[siblingIdx] ?? layer[idx];
      siblings.push({ hash: sibling, position: isRight ? "left" : "right" });
      const next: string[] = [];
      for (let i = 0; i < layer.length; i += 2) {
        const left = layer[i];
        const right = layer[i + 1] ?? left;
        next.push(sha256Hex(left + right));
      }
      layer = next;
      idx = Math.floor(idx / 2);
    }
    return { leaf: this.leaves[index], siblings, root: layer[0] };
  }

  /** מאמת הוכחת הכלה. */
  static verifyProof(proof: MerkleProof): boolean {
    let acc = proof.leaf;
    for (const s of proof.siblings) {
      acc = s.position === "left" ? sha256Hex(s.hash + acc) : sha256Hex(acc + s.hash);
    }
    return acc === proof.root;
  }
}

export function hashEvent(event: AuditEvent): string {
  return sha256Hex(JSON.stringify({ id: event.id, occurredAt: event.occurredAt, payload: event.payload }));
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}
