/**
 * בדיקת מסלול אנונימיזציה — מסתמכת על mock של prisma + audit,
 * כדי להריץ בלי DB אמיתי.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

// Mocks חייבים להיכנס לפני import של המודול הנבדק
vi.mock("../src/lib/db", () => {
  const consents: Array<{ id: string; userId: string; channel: string; purpose: string }> = [
    { id: "c1", userId: "u1", channel: "EMAIL", purpose: "marketing" },
  ];
  const state = {
    erasure: {
      id: "e1",
      userId: "u1",
      status: "IN_PROGRESS" as string,
      user: { id: "u1", email: "u1@example.co.il" },
    },
    userUpdates: [] as unknown[],
    consentUpdates: [] as unknown[],
    consentEvents: [] as unknown[],
    erasureUpdates: [] as unknown[],
  };

  const prisma = {
    erasureRequest: {
      findUnique: vi.fn(async () => state.erasure),
      update: vi.fn(async (arg: { data: unknown }) => {
        state.erasureUpdates.push(arg.data);
        return state.erasure;
      }),
    },
    user: {
      update: vi.fn(async (arg: { data: unknown }) => {
        state.userUpdates.push(arg.data);
        return state.erasure.user;
      }),
    },
    consent: {
      updateMany: vi.fn(async (arg: { data: unknown }) => {
        state.consentUpdates.push(arg.data);
        return { count: 1 };
      }),
      findMany: vi.fn(async () => consents),
    },
    consentEvent: {
      create: vi.fn(async (arg: { data: unknown }) => {
        state.consentEvents.push(arg.data);
        return { id: "ce" + Math.random() };
      }),
    },
    $transaction: vi.fn(async (cb: (tx: typeof prisma) => Promise<void>) => {
      await cb(prisma);
    }),
  };

  return { prisma, __state: state };
});

vi.mock("../src/lib/queue", () => ({
  getRedisConnection: vi.fn(),
  ERASURE_QUEUE: "test",
}));

vi.mock("../src/lib/audit", () => ({
  audit: vi.fn(async () => undefined),
}));

import { processErasureJob } from "../src/workers/erasureExecutor";
import { audit } from "../src/lib/audit";
// @ts-expect-error — accessing test-only state
import { __state } from "../src/lib/db";

beforeEach(() => {
  __state.userUpdates.length = 0;
  __state.consentUpdates.length = 0;
  __state.consentEvents.length = 0;
  __state.erasureUpdates.length = 0;
});

describe("processErasureJob", () => {
  it("מבצע אנונימיזציה ב-cascade", async () => {
    const r = await processErasureJob({ erasureRequestId: "e1" });
    expect(r.anonymized).toBe(true);

    // userUpdate הראשון אמור לכלול הסרת PII
    const uu = __state.userUpdates[0] as Record<string, unknown>;
    expect(uu.fullName).toBeNull();
    expect(uu.phone).toBeNull();
    expect(uu.isDeleted).toBe(true);
    expect(typeof uu.email).toBe("string");
    expect(uu.email).toMatch(/anonymized\.invalid$/);

    // consent updateMany קרא
    expect(__state.consentUpdates[0]).toMatchObject({ isActive: false });

    // יוצר אירוע REVOKED_BY_ADMIN לכל consent
    expect(__state.consentEvents[0]).toMatchObject({ action: "REVOKED_BY_ADMIN" });

    // הסטטוס הסופי ANONYMIZED
    expect(__state.erasureUpdates.at(-1)).toMatchObject({ status: "ANONYMIZED" });

    // audit נרשם
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "ERASURE_EXECUTED", entity: "User" }),
    );
  });
});
