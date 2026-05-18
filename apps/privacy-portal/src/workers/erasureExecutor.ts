/**
 * Erasure Executor Worker
 * מבצע cascade soft-delete + אנונימיזציה למשתמש.
 * משאיר במכוון:
 *   - AuditLog (חובה משפטית)
 *   - חשבוניות (legalRetentionUntil — 7 שנים)
 * האנונימיזציה: הסרת PII (שם/אימייל/טלפון) והשארת ה-ID לטובת קישוריות חשבונאית.
 */
import { Worker } from "bullmq";
import { prisma } from "../lib/db";
import { getRedisConnection, ERASURE_QUEUE } from "../lib/queue";
import { audit } from "../lib/audit";

interface ErasureJobPayload {
  erasureRequestId: string;
}

export async function processErasureJob(payload: ErasureJobPayload): Promise<{ anonymized: true }> {
  const erasure = await prisma.erasureRequest.findUnique({
    where: { id: payload.erasureRequestId },
    include: { user: true },
  });
  if (!erasure) throw new Error(`Erasure ${payload.erasureRequestId} not found`);
  if (erasure.status !== "IN_PROGRESS" && erasure.status !== "APPROVED") {
    throw new Error(`Cannot execute erasure in status ${erasure.status}`);
  }
  const userId = erasure.userId;

  // אנונימיזציה ב-transaction אחד — או הכל או כלום
  await prisma.$transaction(async (tx) => {
    // 1. מסמנים את ה-User כ-deleted ומחליפים PII בערכים אנונימיים
    const anonymousEmail = `deleted+${userId}@anonymized.invalid`;
    await tx.user.update({
      where: { id: userId },
      data: {
        email: anonymousEmail,
        fullName: null,
        phone: null,
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    // 2. ביטול כל ההסכמות
    await tx.consent.updateMany({
      where: { userId },
      data: { isActive: false, optOutAt: new Date() },
    });

    // 3. תיעוד אירוע OPT_OUT כללי לכל ערוץ (לטובת היסטוריה)
    const channels = await tx.consent.findMany({ where: { userId } });
    for (const c of channels) {
      await tx.consentEvent.create({
        data: {
          userId,
          channel: c.channel,
          purpose: c.purpose,
          action: "REVOKED_BY_ADMIN",
          proof: { reason: "erasure" },
        },
      });
    }

    // 4. סימון הבקשה כ-ANONYMIZED
    await tx.erasureRequest.update({
      where: { id: erasure.id },
      data: { status: "ANONYMIZED", completedAt: new Date() },
    });
  });

  // 5. תיעוד audit — חובה לשמור גם אחרי המחיקה
  await audit({
    userId,
    actor: "system",
    action: "ERASURE_EXECUTED",
    entity: "User",
    entityId: userId,
    metadata: {
      // נשמרים: AuditLog, חשבוניות (לפי דרישות חשבונאות) — ראה DATA-RETENTION-POLICY.md
      retained: ["AuditLog", "Invoices(7y)"],
      anonymizedFields: ["email", "fullName", "phone"],
    },
  });

  return { anonymized: true };
}

if (process.env.NODE_ENV !== "test" && require.main === module) {
  // eslint-disable-next-line no-console
  console.log(`[erasureExecutor] listening on queue ${ERASURE_QUEUE}`);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const worker = new Worker<ErasureJobPayload>(
    ERASURE_QUEUE,
    async (job) => processErasureJob(job.data),
    { connection: getRedisConnection(), concurrency: 1 },
  );
  worker.on("failed", async (job, err) => {
    if (!job) return;
    await prisma.erasureRequest
      .update({
        where: { id: job.data.erasureRequestId },
        data: { status: "FAILED", failReason: err.message.slice(0, 500) },
      })
      .catch(() => undefined);
    // eslint-disable-next-line no-console
    console.error("[erasureExecutor] job failed", job.id, err.message);
  });
}
