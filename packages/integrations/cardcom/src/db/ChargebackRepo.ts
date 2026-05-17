import type { Pool } from 'pg';

export interface ChargebackRow {
  id: number;
  transactionId: string;
  amount: number;
  reason?: string;
  status: 'opened' | 'resolved';
  receivedAt: Date;
  resolvedAt?: Date;
  raw: unknown;
}

export class ChargebackRepo {
  constructor(private readonly pool: Pool) {}

  async recordOpened(opts: {
    transactionId: string;
    amount: number;
    reason: string;
    receivedAt: Date;
    raw: unknown;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO cardcom_chargebacks
        (transaction_id, amount, reason, status, received_at, raw)
       VALUES ($1,$2,$3,'opened',$4,$5)`,
      [
        opts.transactionId,
        opts.amount,
        opts.reason,
        opts.receivedAt,
        JSON.stringify(opts.raw),
      ]
    );
  }

  async recordResolved(opts: {
    transactionId: string;
    resolvedAt: Date;
    raw: unknown;
  }): Promise<void> {
    await this.pool.query(
      `UPDATE cardcom_chargebacks
       SET status='resolved', resolved_at=$2, raw=$3
       WHERE transaction_id=$1 AND status='opened'`,
      [opts.transactionId, opts.resolvedAt, JSON.stringify(opts.raw)]
    );
  }

  async listOpen(): Promise<ChargebackRow[]> {
    const res = await this.pool.query(
      `SELECT id, transaction_id, amount, reason, status, received_at, resolved_at, raw
         FROM cardcom_chargebacks WHERE status='opened' ORDER BY received_at DESC`
    );
    return res.rows.map((r) => ({
      id: r.id,
      transactionId: r.transaction_id,
      amount: Number(r.amount),
      reason: r.reason ?? undefined,
      status: r.status,
      receivedAt: r.received_at,
      resolvedAt: r.resolved_at ?? undefined,
      raw: r.raw,
    }));
  }
}
