/**
 * Scheduler — BullMQ cron jobs לדוחות תקופתיים
 *
 * Jobs:
 *   - daily-pnl-snapshot       — 06:00 כל יום
 *   - weekly-cashflow-forecast — שני 07:00
 *   - monthly-vat-report       — ה-1 בכל חודש 08:00
 *   - monthly-pnl-summary      — ה-1 בכל חודש 08:30
 *
 * Distribution: SendGrid → רשימת תפוצה מ-tenant.metadata.reportRecipients[]
 */
import { Queue, Worker, type Job } from "bullmq";
import IORedis from "ioredis";
import sgMail from "@sendgrid/mail";
import { z } from "zod";
import { addMonths, startOfMonth, endOfMonth, startOfDay } from "date-fns";
import { getPrisma } from "../utils/prisma.js";
import { buildPnL } from "../aggregations/pnl.js";
import { buildCashflow } from "../aggregations/cashflow.js";
import { buildVatReport, VAT_RATE_2025 } from "../aggregations/vat.js";
import { buildPnLPdf, buildVatPdf } from "./pdf-builder.js";
import { buildCashflowExcel, buildPnLExcel, buildVatExcel } from "./excel-builder.js";

const QUEUE_NAME = "reports-bi";

export const ReportJobSchema = z.object({
  kind: z.enum(["daily-pnl", "weekly-cashflow", "monthly-vat", "monthly-pnl"]),
  tenantId: z.string().uuid(),
  recipients: z.array(z.string().email()).min(1),
});
export type ReportJob = z.infer<typeof ReportJobSchema>;

function buildConnection(): IORedis {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  return new IORedis(url, { maxRetriesPerRequest: null });
}

export function buildQueue(): Queue<ReportJob> {
  return new Queue<ReportJob>(QUEUE_NAME, { connection: buildConnection() });
}

/** רושם 4 ה-cron jobs (שיתקדמו אוטומטית) */
export async function registerCronJobs(queue: Queue<ReportJob>, tenantId: string, recipients: string[]) {
  await queue.add(
    "daily-pnl",
    { kind: "daily-pnl", tenantId, recipients },
    { repeat: { pattern: "0 6 * * *", tz: "Asia/Jerusalem" }, jobId: `daily-pnl:${tenantId}` },
  );
  await queue.add(
    "weekly-cashflow",
    { kind: "weekly-cashflow", tenantId, recipients },
    { repeat: { pattern: "0 7 * * 1", tz: "Asia/Jerusalem" }, jobId: `weekly-cashflow:${tenantId}` },
  );
  await queue.add(
    "monthly-vat",
    { kind: "monthly-vat", tenantId, recipients },
    { repeat: { pattern: "0 8 1 * *", tz: "Asia/Jerusalem" }, jobId: `monthly-vat:${tenantId}` },
  );
  await queue.add(
    "monthly-pnl",
    { kind: "monthly-pnl", tenantId, recipients },
    { repeat: { pattern: "30 8 1 * *", tz: "Asia/Jerusalem" }, jobId: `monthly-pnl:${tenantId}` },
  );
}

/** Worker שמטפל ב-jobs ושולח email דרך SendGrid */
export function buildWorker(): Worker<ReportJob> {
  if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  }
  const from = process.env.SENDGRID_FROM ?? "reports@aneh-hashoel.co.il";

  return new Worker<ReportJob>(
    QUEUE_NAME,
    async (job: Job<ReportJob>) => {
      const parsed = ReportJobSchema.parse(job.data);
      const result = await runReportJob(parsed);
      if (process.env.SENDGRID_API_KEY) {
        await sgMail.send({
          from,
          to: parsed.recipients,
          subject: result.subject,
          text: result.text,
          attachments: result.attachments.map((a) => ({
            content: a.content.toString("base64"),
            filename: a.filename,
            type: a.contentType,
            disposition: "attachment",
          })),
        });
      }
      return { sent: result.attachments.map((a) => a.filename) };
    },
    { connection: buildConnection() },
  );
}

interface ReportResult {
  subject: string;
  text: string;
  attachments: { filename: string; content: Buffer; contentType: string }[];
}

export async function runReportJob(job: ReportJob): Promise<ReportResult> {
  const today = startOfDay(new Date());
  switch (job.kind) {
    case "daily-pnl": {
      const range = { from: startOfMonth(today), to: today };
      const buckets = await buildPnL({ tenantId: job.tenantId, period: "month", range });
      const pdf = await buildPnLPdf({ buckets, periodLabel: `${range.from.toISOString().slice(0, 7)}` });
      const xlsx = await buildPnLExcel({ buckets, periodLabel: range.from.toISOString().slice(0, 7) });
      return {
        subject: `דוח יומי — רווח והפסד (${today.toISOString().slice(0, 10)})`,
        text: "מצורף דוח רווח והפסד עדכני לחודש הנוכחי.",
        attachments: [
          { filename: "pnl-daily.pdf", content: pdf, contentType: "application/pdf" },
          {
            filename: "pnl-daily.xlsx",
            content: xlsx,
            contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          },
        ],
      };
    }
    case "weekly-cashflow": {
      const historicalRange = { from: addMonths(today, -12), to: today };
      const points = await buildCashflow({ tenantId: job.tenantId, historicalRange, forecastMonths: 6 });
      const xlsx = await buildCashflowExcel(points);
      return {
        subject: `דוח תזרים מזומנים שבועי + תחזית 6 חודשים`,
        text: "מצורף דוח תזרים עם חיזוי 6 חודשים קדימה.",
        attachments: [
          {
            filename: "cashflow.xlsx",
            content: xlsx,
            contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          },
        ],
      };
    }
    case "monthly-vat": {
      const lastMonth = addMonths(today, -1);
      const range = { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
      const buckets = await buildVatReport({ tenantId: job.tenantId, range });
      const pdf = await buildVatPdf({ buckets, rate: VAT_RATE_2025, periodLabel: range.from.toISOString().slice(0, 7) });
      const xlsx = await buildVatExcel({ buckets, rate: VAT_RATE_2025 });
      return {
        subject: `דוח מע"מ — ${range.from.toISOString().slice(0, 7)}`,
        text: 'מצורף דוח מע"מ חודשי (18%) להגשה לרשויות.',
        attachments: [
          { filename: "vat.pdf", content: pdf, contentType: "application/pdf" },
          {
            filename: "vat.xlsx",
            content: xlsx,
            contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          },
        ],
      };
    }
    case "monthly-pnl": {
      const lastMonth = addMonths(today, -1);
      const range = { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
      const buckets = await buildPnL({ tenantId: job.tenantId, period: "month", range });
      const pdf = await buildPnLPdf({ buckets, periodLabel: range.from.toISOString().slice(0, 7) });
      const xlsx = await buildPnLExcel({ buckets, periodLabel: range.from.toISOString().slice(0, 7) });
      return {
        subject: `סיכום רווח והפסד — ${range.from.toISOString().slice(0, 7)}`,
        text: "מצורף סיכום רווח והפסד לחודש הקודם.",
        attachments: [
          { filename: "pnl-monthly.pdf", content: pdf, contentType: "application/pdf" },
          {
            filename: "pnl-monthly.xlsx",
            content: xlsx,
            contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          },
        ],
      };
    }
  }
}

// Entrypoint עבור `pnpm scheduler:start`
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  const worker = buildWorker();
  worker.on("ready", () => console.log("[scheduler] worker ready"));
  worker.on("completed", (job, result) =>
    console.log(`[scheduler] completed ${job.id}`, result),
  );
  worker.on("failed", (job, err) =>
    console.error(`[scheduler] failed ${job?.id}`, err.message),
  );
  // לא יוצאים — Worker רץ עד SIGINT
  void getPrisma();
}
