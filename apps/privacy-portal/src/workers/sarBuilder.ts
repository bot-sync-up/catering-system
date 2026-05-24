/**
 * SAR Builder Worker
 * אוסף את כל הנתונים על משתמש ממודולים פנימיים (mocks):
 * CRM, Orders, Invoices, Payments, Events.
 * בונה ZIP עם JSON לכל מודול + PDF סיכום ושומר ב-artifacts/.
 */
import { Worker } from "bullmq";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import JSZip from "jszip";
import PDFDocument from "pdfkit";
import { prisma } from "../lib/db";
import { getRedisConnection, SAR_QUEUE } from "../lib/queue";
import { fetchAllModules, type ModuleName } from "../lib/mocks/dataSources";
import { audit } from "../lib/audit";

const ARTIFACTS_DIR = process.env.ARTIFACTS_DIR ?? "./artifacts/sar";

interface SarJobPayload {
  sarRequestId: string;
}

async function buildPdfSummary(userId: string, modules: Record<ModuleName, unknown>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40, lang: "he" });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).text("Privacy Data Export Summary", { align: "center" });
    doc.moveDown();
    doc.fontSize(11).text(`User ID: ${userId}`);
    doc.text(`Generated: ${new Date().toISOString()}`);
    doc.moveDown();
    doc.text("This archive contains all personal data we hold about you, per Privacy Law Amendment 13 (Israel, 8/2025).");
    doc.moveDown();
    for (const [name, data] of Object.entries(modules)) {
      doc.fontSize(13).text(`Module: ${name}`);
      const json = JSON.stringify(data, null, 2);
      doc.fontSize(9).text(json.length > 2000 ? json.slice(0, 2000) + "\n... (truncated, see JSON file) ..." : json);
      doc.moveDown();
    }
    doc.end();
  });
}

export async function processSarJob(payload: SarJobPayload): Promise<{ artifactPath: string }> {
  const sar = await prisma.sarRequest.findUnique({
    where: { id: payload.sarRequestId },
    include: { user: true },
  });
  if (!sar) throw new Error(`SAR ${payload.sarRequestId} not found`);

  const modules = await fetchAllModules(sar.userId);

  const zip = new JSZip();
  zip.file("README.txt",
    `Privacy Data Export\n===================\n` +
    `User: ${sar.user.email}\n` +
    `Generated: ${new Date().toISOString()}\n` +
    `Request ID: ${sar.id}\n\n` +
    `Files:\n` +
    `- crm.json — Customer relationship data\n` +
    `- orders.json — Order history\n` +
    `- invoices.json — Invoices (note: legal retention 7 years)\n` +
    `- payments.json — Payment records (PAN truncated)\n` +
    `- events.json — Activity events\n` +
    `- summary.pdf — Human-readable summary\n`,
  );
  zip.file("crm.json", JSON.stringify(modules.crm, null, 2));
  zip.file("orders.json", JSON.stringify(modules.orders, null, 2));
  zip.file("invoices.json", JSON.stringify(modules.invoices, null, 2));
  zip.file("payments.json", JSON.stringify(modules.payments, null, 2));
  zip.file("events.json", JSON.stringify(modules.events, null, 2));

  const pdfBuf = await buildPdfSummary(sar.userId, modules as Record<ModuleName, unknown>);
  zip.file("summary.pdf", pdfBuf);

  const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

  await mkdir(ARTIFACTS_DIR, { recursive: true });
  const path = join(ARTIFACTS_DIR, `${sar.id}.zip`);
  await writeFile(path, buf);

  await prisma.sarRequest.update({
    where: { id: sar.id },
    data: { status: "READY", completedAt: new Date(), artifactPath: path },
  });

  await audit({
    userId: sar.userId,
    actor: "system",
    action: "SAR_BUILT",
    entity: "SarRequest",
    entityId: sar.id,
    metadata: { bytes: buf.length, modules: Object.keys(modules) },
  });

  return { artifactPath: path };
}

if (process.env.NODE_ENV !== "test" && require.main === module) {
  // eslint-disable-next-line no-console
  console.log(`[sarBuilder] listening on queue ${SAR_QUEUE}`);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const worker = new Worker<SarJobPayload>(
    SAR_QUEUE,
    async (job) => processSarJob(job.data),
    { connection: getRedisConnection(), concurrency: 2 },
  );
  worker.on("failed", async (job, err) => {
    if (!job) return;
    await prisma.sarRequest
      .update({
        where: { id: job.data.sarRequestId },
        data: { status: "FAILED", failReason: err.message.slice(0, 500) },
      })
      .catch(() => undefined);
    // eslint-disable-next-line no-console
    console.error("[sarBuilder] job failed", job.id, err.message);
  });
}
