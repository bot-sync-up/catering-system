/**
 * SagaCoordinator — implements the Saga pattern (orchestration style).
 *
 * Saga = רצף שלבים שכל אחד מהם יכול להיכשל.
 * אם שלב נכשל, מריצים compensation לכל השלבים שהצליחו עד עכשיו
 * בסדר הפוך — כדי להחזיר את המערכת ל-consistent state.
 *
 * שימוש:
 *   const saga = new SagaCoordinator({ logger });
 *   await saga.run({
 *     name: 'cancel-event',
 *     steps: [
 *       { name: 'refund', execute: ..., compensate: ... },
 *       ...
 *     ],
 *     context: { eventId: '...' }
 *   });
 */
import pino, { type Logger } from 'pino';

export interface SagaContext {
  /** ה-context משתנה בין שלבים — כל שלב יכול להוסיף נתונים */
  [key: string]: unknown;
}

export interface SagaStep<TContext extends SagaContext = SagaContext> {
  /** שם השלב — לדיווח/לוג */
  name: string;
  /** פעולת הביצוע — חייבת להיות idempotent */
  execute: (ctx: TContext) => Promise<void> | void;
  /** פעולת תיקון — מתבצעת רק אם השלב הצליח ושלב מאוחר יותר נכשל */
  compensate: (ctx: TContext) => Promise<void> | void;
  /** האם להמשיך גם אם compensate נכשל (ברירת מחדל: true — log+continue) */
  continueOnCompensateError?: boolean;
}

export interface SagaDefinition<TContext extends SagaContext = SagaContext> {
  name: string;
  steps: SagaStep<TContext>[];
  context: TContext;
}

export interface SagaResult<TContext extends SagaContext = SagaContext> {
  success: boolean;
  context: TContext;
  failedStep?: string;
  error?: unknown;
  compensated: string[];
  compensationErrors: Array<{ step: string; error: unknown }>;
}

export interface SagaCoordinatorOptions {
  logger?: Logger;
}

export class SagaCoordinator {
  private readonly logger: Logger;

  constructor(opts: SagaCoordinatorOptions = {}) {
    this.logger = opts.logger ?? pino({ name: 'saga-coordinator' });
  }

  /**
   * הרץ saga. מחזיר תוצאה (success/failure + compensations שבוצעו).
   */
  async run<TContext extends SagaContext>(
    def: SagaDefinition<TContext>
  ): Promise<SagaResult<TContext>> {
    const executed: SagaStep<TContext>[] = [];
    const log = this.logger.child({ saga: def.name });
    log.info({ steps: def.steps.length }, 'saga starting');

    for (const step of def.steps) {
      try {
        log.debug({ step: step.name }, 'executing step');
        await step.execute(def.context);
        executed.push(step);
        log.info({ step: step.name }, 'step ok');
      } catch (err) {
        log.error({ err, step: step.name }, 'step failed — running compensations');
        const compensation = await this.compensate(executed, def.context, log);
        return {
          success: false,
          context: def.context,
          failedStep: step.name,
          error: err,
          compensated: compensation.compensated,
          compensationErrors: compensation.errors,
        };
      }
    }

    log.info('saga completed successfully');
    return {
      success: true,
      context: def.context,
      compensated: [],
      compensationErrors: [],
    };
  }

  /**
   * מריץ compensations בסדר הפוך לזה של ה-execute.
   */
  private async compensate<TContext extends SagaContext>(
    executed: SagaStep<TContext>[],
    ctx: TContext,
    log: Logger
  ): Promise<{ compensated: string[]; errors: Array<{ step: string; error: unknown }> }> {
    const compensated: string[] = [];
    const errors: Array<{ step: string; error: unknown }> = [];

    for (let i = executed.length - 1; i >= 0; i--) {
      const step = executed[i]!;
      try {
        log.debug({ step: step.name }, 'compensating');
        await step.compensate(ctx);
        compensated.push(step.name);
      } catch (err) {
        log.error({ err, step: step.name }, 'compensation failed');
        errors.push({ step: step.name, error: err });
        if (!(step.continueOnCompensateError ?? true)) {
          break;
        }
      }
    }
    return { compensated, errors };
  }
}
