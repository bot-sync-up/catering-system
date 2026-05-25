/**
 * תזמון יצירת קבצי הדיווח באמצעות BullMQ.
 *
 * תזמונים:
 *  - "monthly-files":   ה-10 לכל חודש 09:00 Asia/Jerusalem - מפיק PCN874 + Form102 + Income/Balance/Journal לחודש הקודם.
 *  - "annual-files":    31/3 09:00 Asia/Jerusalem        - מפיק Form856 + Form126 + Annual Reports לשנה הקודמת.
 *  - "weekly-summary":  ראשון 09:00 Asia/Jerusalem       - שולח מייל סיכום מצב קבצים.
 *
 * האפליקציה אחראית להזריק את הקונקשן ל-Redis, AccountantWorkflow,
 * וספקי הנתונים (DataInputs). זה נשאר framework-agnostic.
 */
import type { Queue, Worker, QueueOptions, WorkerOptions, Job } from 'bullmq';
import { AccountantWorkflow } from '../AccountantWorkflow';
import { ReportPeriod } from '../types';

export const QUEUE_NAME = 'accountant-reports';

export type MonthlyJobData =
  | { type: 'monthly'; period: ReportPeriod }
  | { type: 'annual'; period: ReportPeriod }
  | { type: 'weekly-summary' };

export interface SchedulerDependencies {
  workflow: AccountantWorkflow;
  /** ספק נתונים לפי תקופה (יוזרק על ידי האפליקציה) */
  loadDataForPeriod: (period: ReportPeriod, scope: 'monthly' | 'annual') => Promise<{
    vatTransactions?: any[];
    customers?: any[];
    suppliers?: any[];
    employees?: any[];
    journalLines?: any[];
    balanceSheet?: any[];
    incomeStatement?: any[];
  }>;
}

export class MonthlyReportJobs {
  private queue?: Queue;
  private worker?: Worker;

  constructor(
    private readonly deps: SchedulerDependencies,
    private readonly tz = 'Asia/Jerusalem',
  ) {}

  /**
   * רישום משימות חוזרות. צריך להפעיל בעת startup של האפליקציה.
   */
  async registerRecurringJobs(QueueImpl: typeof Queue, queueOpts: QueueOptions): Promise<Queue> {
    this.queue = new QueueImpl(QUEUE_NAME, queueOpts);

    // monthly: ה-10 לחודש 09:00
    await this.queue.add(
      'monthly-files',
      { type: 'monthly' } as Partial<MonthlyJobData>,
      {
        repeat: { pattern: '0 9 10 * *', tz: this.tz },
        jobId: 'monthly-files',
      },
    );

    // annual: 31 במרץ 09:00
    await this.queue.add(
      'annual-files',
      { type: 'annual' } as Partial<MonthlyJobData>,
      {
        repeat: { pattern: '0 9 31 3 *', tz: this.tz },
        jobId: 'annual-files',
      },
    );

    // weekly summary: ראשון 09:00 (ראשון = 0 ב-cron)
    await this.queue.add(
      'weekly-summary',
      { type: 'weekly-summary' } as Partial<MonthlyJobData>,
      {
        repeat: { pattern: '0 9 * * 0', tz: this.tz },
        jobId: 'weekly-summary',
      },
    );

    return this.queue;
  }

  /**
   * מפעיל Worker שמטפל במשימות.
   */
  startWorker(WorkerImpl: typeof Worker, workerOpts: WorkerOptions): Worker {
    this.worker = new WorkerImpl(
      QUEUE_NAME,
      async (job: Job<MonthlyJobData>) => this.handle(job.data),
      workerOpts,
    );
    return this.worker;
  }

  async handle(data: MonthlyJobData): Promise<{ processed: number }> {
    if (data.type === 'monthly') {
      const period = data.period ?? this.previousMonth();
      const inputs = await this.deps.loadDataForPeriod(period, 'monthly');
      const results = await this.deps.workflow.runMonthly(period, inputs);
      return { processed: results.length };
    }
    if (data.type === 'annual') {
      const period = data.period ?? this.previousYear();
      const inputs = await this.deps.loadDataForPeriod(period, 'annual');
      const results = await this.deps.workflow.runAnnual(period, inputs);
      return { processed: results.length };
    }
    if (data.type === 'weekly-summary') {
      await this.deps.workflow.sendWeeklySummary();
      return { processed: 1 };
    }
    return { processed: 0 };
  }

  private previousMonth(): ReportPeriod {
    const now = new Date();
    const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const m = now.getMonth() === 0 ? 12 : now.getMonth();
    return { period: `${y}-${String(m).padStart(2, '0')}`, year: y, month: m };
  }

  private previousYear(): ReportPeriod {
    const y = new Date().getFullYear() - 1;
    return { period: String(y), year: y };
  }
}
