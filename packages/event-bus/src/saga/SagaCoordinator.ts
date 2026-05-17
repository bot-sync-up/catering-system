/**
 * SagaCoordinator - מנגנון orchestration ל-distributed transactions.
 *
 * כל saga מורכב מ-steps. כל step מבצע פעולה ויכול לחזור עליה (compensate)
 * במקרה של כשל בשלב מאוחר יותר.
 *
 * הפלטפורמה משתמשת ב-saga פטרן כדי להבטיח עקביות בין שירותים
 * (orders, finance, kitchen, logistics) ללא transactions גלובליות.
 */

import pino, { type Logger } from 'pino';
import { v4 as uuidv4 } from 'uuid';

export interface SagaStep<TContext> {
  /** שם השלב לצורכי לוגינג */
  name: string;
  /** הפעולה הראשית של השלב */
  execute: (ctx: TContext) => Promise<void>;
  /** פעולת פיצוי - מתבצעת במקרה של rollback */
  compensate?: (ctx: TContext) => Promise<void>;
  /** מספר ניסיונות לפני שמכריזים כשל */
  retries?: number;
}

export interface SagaResult<TContext> {
  sagaId: string;
  status: 'completed' | 'compensated' | 'failed';
  context: TContext;
  completedSteps: string[];
  compensatedSteps: string[];
  error?: string;
}

export interface SagaCoordinatorOptions {
  logger?: Logger;
  retryDelayMs?: number;
}

export class SagaCoordinator<TContext extends Record<string, unknown>> {
  private readonly steps: SagaStep<TContext>[] = [];
  private readonly logger: Logger;
  private readonly retryDelayMs: number;

  constructor(
    private readonly name: string,
    options: SagaCoordinatorOptions = {},
  ) {
    this.logger = options.logger ?? pino({ name: `saga:${name}` });
    this.retryDelayMs = options.retryDelayMs ?? 500;
  }

  /** הוספת step ל-saga */
  addStep(step: SagaStep<TContext>): this {
    this.steps.push(step);
    return this;
  }

  /** הוספת מספר steps בבת אחת */
  addSteps(steps: SagaStep<TContext>[]): this {
    this.steps.push(...steps);
    return this;
  }

  /**
   * הרצת ה-saga. במקרה של כשל באחד השלבים, מתבצע compensate
   * בסדר הפוך לכל ה-steps שכבר רצו בהצלחה.
   */
  async run(initialContext: TContext): Promise<SagaResult<TContext>> {
    const sagaId = uuidv4();
    const context = { ...initialContext } as TContext;
    const completedSteps: string[] = [];
    const compensatedSteps: string[] = [];

    this.logger.info({ sagaId, name: this.name }, 'התחלת saga');

    for (const step of this.steps) {
      const ok = await this.runStep(step, context, sagaId);
      if (!ok.success) {
        this.logger.error(
          { sagaId, step: step.name, err: ok.error },
          'כשל ב-step - מתחיל compensate',
        );
        const compensated = await this.compensate(completedSteps, context, sagaId);
        compensatedSteps.push(...compensated);
        return {
          sagaId,
          status: 'compensated',
          context,
          completedSteps,
          compensatedSteps,
          error: ok.error,
        };
      }
      completedSteps.push(step.name);
    }

    this.logger.info({ sagaId, name: this.name }, 'saga הושלם בהצלחה');
    return {
      sagaId,
      status: 'completed',
      context,
      completedSteps,
      compensatedSteps,
    };
  }

  private async runStep(
    step: SagaStep<TContext>,
    context: TContext,
    sagaId: string,
  ): Promise<{ success: true } | { success: false; error: string }> {
    const maxAttempts = (step.retries ?? 0) + 1;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        this.logger.debug(
          { sagaId, step: step.name, attempt },
          'מריץ step',
        );
        await step.execute(context);
        return { success: true };
      } catch (err) {
        const message = (err as Error).message;
        this.logger.warn(
          { sagaId, step: step.name, attempt, err: message },
          'step נכשל',
        );
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, this.retryDelayMs * attempt));
        } else {
          return { success: false, error: message };
        }
      }
    }
    return { success: false, error: 'unreachable' };
  }

  private async compensate(
    completed: string[],
    context: TContext,
    sagaId: string,
  ): Promise<string[]> {
    const compensated: string[] = [];
    // הרצה הפוכה - הראשון שהושלם הוא האחרון שמתפצה
    for (const stepName of [...completed].reverse()) {
      const step = this.steps.find((s) => s.name === stepName);
      if (!step?.compensate) continue;
      try {
        this.logger.info({ sagaId, step: stepName }, 'מפצה step');
        await step.compensate(context);
        compensated.push(stepName);
      } catch (err) {
        this.logger.error(
          { sagaId, step: stepName, err: (err as Error).message },
          'נכשל compensate - דורש התערבות ידנית',
        );
      }
    }
    return compensated;
  }
}
