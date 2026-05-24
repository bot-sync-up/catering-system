/**
 * IPFS stub — בעתיד יוחלף ב-`ipfs-http-client` אמיתי או Pinata SDK.
 * כרגע מחשב CID דטרמיניסטי על בסיס SHA-256 של התוכן.
 */

import { createHash } from "node:crypto";

export interface IPFSClient {
  add(content: Buffer | string): Promise<{ cid: string; size: number }>;
  pin(cid: string): Promise<void>;
  get(cid: string): Promise<Buffer | null>;
}

export class IPFSStubClient implements IPFSClient {
  private store = new Map<string, Buffer>();
  private pinned = new Set<string>();

  async add(content: Buffer | string): Promise<{ cid: string; size: number }> {
    const buf = typeof content === "string" ? Buffer.from(content, "utf-8") : content;
    const hash = createHash("sha256").update(buf).digest("hex");
    // CIDv1-like stub — לא תקני באמת, אבל יציב לבדיקות.
    const cid = `bafkstub${hash.slice(0, 50)}`;
    this.store.set(cid, buf);
    return { cid, size: buf.length };
  }

  async pin(cid: string): Promise<void> {
    if (!this.store.has(cid)) throw new Error("CID_NOT_FOUND");
    this.pinned.add(cid);
  }

  async get(cid: string): Promise<Buffer | null> {
    return this.store.get(cid) ?? null;
  }

  isPinned(cid: string): boolean {
    return this.pinned.has(cid);
  }
}
