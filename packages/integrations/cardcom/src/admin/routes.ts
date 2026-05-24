import { IntegrationLogRepo } from '../db/IntegrationLogRepo';
import { ChargebackRepo } from '../db/ChargebackRepo';
import { Queue } from 'bullmq';
import { CardComJobData, enqueueCardComJob } from '../queue/bullmq';

/**
 * Framework-agnostic admin route handlers.
 * Wire to express/fastify/next on the host application.
 */
export interface AdminDeps {
  logs: IntegrationLogRepo;
  chargebacks: ChargebackRepo;
  queue: Queue<CardComJobData>;
}

export function createAdminHandlers(deps: AdminDeps) {
  return {
    async listLogs(query: {
      flow?: string;
      success?: 'true' | 'false';
      limit?: string;
      offset?: string;
    }) {
      return deps.logs.list({
        flow: query.flow,
        success:
          query.success === 'true' ? true : query.success === 'false' ? false : undefined,
        limit: query.limit ? Number(query.limit) : 50,
        offset: query.offset ? Number(query.offset) : 0,
      });
    },

    async listChargebacks() {
      return deps.chargebacks.listOpen();
    },

    async retryJob(body: CardComJobData) {
      const job = await enqueueCardComJob(deps.queue, body, { attempts: 3 });
      return { jobId: job.id };
    },

    /**
     * Allow admins to edit any pending payload field before retry.
     * Body: { original: CardComJobData, overrides: Record<string, unknown> }
     */
    async retryWithOverrides(body: {
      original: CardComJobData;
      overrides: Record<string, unknown>;
    }) {
      const merged: CardComJobData = {
        ...body.original,
        payload: { ...body.original.payload, ...body.overrides },
      };
      const job = await enqueueCardComJob(deps.queue, merged, { attempts: 3 });
      return { jobId: job.id };
    },
  };
}
