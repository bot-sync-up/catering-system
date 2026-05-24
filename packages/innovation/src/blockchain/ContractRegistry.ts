/**
 * ContractRegistry — sעיגון חוזים על שרשרת (stub).
 *
 * אנו מחשבים SHA-256 של מסמך החוזה ושומרים את ההאש על "שרשרת" (כרגע
 * מערך in-memory / DB דרך adapter), כך שמאוחר יותר נוכל להוכיח שהמסמך
 * לא שונה לאחר חתימה.
 *
 * החלפת ה-adapter ב-Polygon / Ethereum / Hyperledger היא מקומית.
 */

import { createHash } from "node:crypto";

export interface AnchorRecord {
  /** מזהה החוזה במערכת. */
  contractId: string;
  /** Hex של SHA-256. */
  hash: string;
  /** מי עיגן. */
  anchoredBy: string;
  /** מתי עיגן (ms epoch). */
  anchoredAt: number;
  /** מזהה שמוחזר על ידי הרשת — TX hash אמיתי או stub. */
  txReference: string;
}

export interface ContractAnchorAdapter {
  name: string;
  anchor(hashHex: string): Promise<string>; // מחזיר txReference
  verify(hashHex: string, txReference: string): Promise<boolean>;
}

/** Stub Adapter — שומר ב-Map ומחזיר tx מזוייף דטרמיניסטי. */
export class InMemoryAnchorAdapter implements ContractAnchorAdapter {
  name = "in-memory-anchor";
  private map = new Map<string, string>();
  async anchor(hashHex: string): Promise<string> {
    const tx = `stub-tx-${createHash("sha256").update(hashHex + Date.now()).digest("hex").slice(0, 16)}`;
    this.map.set(tx, hashHex);
    return tx;
  }
  async verify(hashHex: string, txReference: string): Promise<boolean> {
    return this.map.get(txReference) === hashHex;
  }
}

export class ContractRegistry {
  private adapter: ContractAnchorAdapter;
  private records = new Map<string, AnchorRecord>();

  constructor(adapter: ContractAnchorAdapter = new InMemoryAnchorAdapter()) {
    this.adapter = adapter;
  }

  /** מחשב hash למסמך (Buffer/string) ועוגן. */
  async anchorContract(
    contractId: string,
    document: Buffer | string,
    anchoredBy: string,
  ): Promise<AnchorRecord> {
    const hash = sha256Hex(document);
    const txReference = await this.adapter.anchor(hash);
    const record: AnchorRecord = {
      contractId,
      hash,
      anchoredBy,
      anchoredAt: Date.now(),
      txReference,
    };
    this.records.set(contractId, record);
    return record;
  }

  async verifyContract(contractId: string, document: Buffer | string): Promise<boolean> {
    const record = this.records.get(contractId);
    if (!record) return false;
    const hash = sha256Hex(document);
    if (hash !== record.hash) return false;
    return this.adapter.verify(hash, record.txReference);
  }

  getRecord(contractId: string): AnchorRecord | undefined {
    return this.records.get(contractId);
  }
}

export function sha256Hex(input: Buffer | string): string {
  return createHash("sha256").update(input).digest("hex");
}
