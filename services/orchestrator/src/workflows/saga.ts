import { logger } from '../lib/logger';
import { RunRecord, recordStep, updateRun } from '../lib/state';

export interface SagaStep<TCtx> {
  name: string;
  action: (ctx: TCtx) => Promise<Partial<TCtx>>;
  /** Optional compensating action invoked on failure of a later step. */
  compensate?: (ctx: TCtx) => Promise<void>;
  /** If true, a failure here does not abort the saga (best-effort step). */
  optional?: boolean;
}

export interface SagaResult<TCtx> {
  ok: boolean;
  ctx: TCtx;
  failedStep?: string;
  error?: string;
  compensated: string[];
}

/**
 * Linear forward-recovery SAGA executor.
 * On step failure (non-optional) it walks back through previously-completed steps and runs each
 * `compensate` in reverse order. State is recorded on the supplied RunRecord.
 */
export async function runSaga<TCtx extends Record<string, unknown>>(
  run: RunRecord,
  initial: TCtx,
  steps: SagaStep<TCtx>[],
): Promise<SagaResult<TCtx>> {
  let ctx = { ...initial };
  const completed: SagaStep<TCtx>[] = [];

  updateRun(run.id, { status: 'running' });

  for (const step of steps) {
    const startedAt = new Date().toISOString();
    recordStep(run.id, { name: step.name, status: 'running', startedAt });
    try {
      const patch = await step.action(ctx);
      ctx = { ...ctx, ...patch };
      recordStep(run.id, {
        name: step.name,
        status: 'completed',
        startedAt,
        finishedAt: new Date().toISOString(),
        output: patch,
      });
      completed.push(step);
      logger.info({ runId: run.id, step: step.name }, 'step completed');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error({ runId: run.id, step: step.name, err: msg }, 'step failed');
      recordStep(run.id, {
        name: step.name,
        status: step.optional ? 'skipped' : 'failed',
        startedAt,
        finishedAt: new Date().toISOString(),
        error: msg,
      });
      if (step.optional) continue;

      // compensate in reverse order
      const compensated: string[] = [];
      for (let i = completed.length - 1; i >= 0; i--) {
        const c = completed[i];
        if (!c.compensate) continue;
        try {
          await c.compensate(ctx);
          recordStep(run.id, {
            name: `compensate:${c.name}`,
            status: 'compensated',
            startedAt: new Date().toISOString(),
            finishedAt: new Date().toISOString(),
          });
          compensated.push(c.name);
        } catch (cErr) {
          const cMsg = cErr instanceof Error ? cErr.message : String(cErr);
          logger.error({ runId: run.id, step: c.name, err: cMsg }, 'compensation failed');
          recordStep(run.id, {
            name: `compensate:${c.name}`,
            status: 'failed',
            startedAt: new Date().toISOString(),
            finishedAt: new Date().toISOString(),
            error: cMsg,
          });
        }
      }
      updateRun(run.id, {
        status: 'failed',
        finishedAt: new Date().toISOString(),
        error: msg,
        context: ctx,
      });
      return { ok: false, ctx, failedStep: step.name, error: msg, compensated };
    }
  }

  updateRun(run.id, { status: 'completed', finishedAt: new Date().toISOString(), context: ctx });
  return { ok: true, ctx, compensated: [] };
}
