import type { Pool } from 'pg';
import { IntegrationLogRecord } from '../types';

export class IntegrationLogRepo {
  constructor(private readonly pool: Pool) {}

  async write(log: IntegrationLogRecord): Promise<number> {
    const res = await this.pool.query<{ id: number }>(
      `INSERT INTO integration_logs
        (created_at, flow, request, response, error_message, http_status, attempt, success, duration_ms)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id`,
      [
        log.createdAt,
        log.flow,
        JSON.stringify(log.request ?? {}),
        log.response ? JSON.stringify(log.response) : null,
        log.errorMessage ?? null,
        log.httpStatus ?? null,
        log.attempt,
        log.success,
        log.durationMs,
      ]
    );
    return res.rows[0].id;
  }

  async list(opts: {
    flow?: string;
    success?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<IntegrationLogRecord[]> {
    const where: string[] = [];
    const params: unknown[] = [];
    if (opts.flow) {
      params.push(opts.flow);
      where.push(`flow = $${params.length}`);
    }
    if (typeof opts.success === 'boolean') {
      params.push(opts.success);
      where.push(`success = $${params.length}`);
    }
    const limit = opts.limit ?? 50;
    const offset = opts.offset ?? 0;
    params.push(limit, offset);
    const sql = `
      SELECT id, created_at, flow, request, response, error_message, http_status,
             attempt, success, duration_ms
      FROM integration_logs
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`;
    const res = await this.pool.query(sql, params);
    return res.rows.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      flow: r.flow,
      request: r.request,
      response: r.response,
      errorMessage: r.error_message ?? undefined,
      httpStatus: r.http_status ?? undefined,
      attempt: r.attempt,
      success: r.success,
      durationMs: r.duration_ms,
    }));
  }
}
