import { Router, type Response } from 'express';
import { z } from 'zod';
import { auditQuerySchema, queryAuditLogs } from './auditQuery';
import { streamAuditCsv } from '../export/csv';
import { streamAuditPdf } from '../export/pdf';
import { requireRole, type AuthedRequest } from '../auth/jwt';
import { writeAudit } from '../audit/writer';
import { getPrisma } from '../db';

/**
 * /audit endpoints — every route here is GENERAL_ADMIN only and
 * auto-records an EXPORT row when CSV/PDF are requested.
 */
export function makeAuditRouter(): Router {
  const router = Router();
  const prisma = getPrisma();

  router.use(requireRole('GENERAL_ADMIN'));

  // GET /audit — paginated JSON listing
  router.get('/', async (req: AuthedRequest, res: Response) => {
    const parsed = auditQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_query', details: parsed.error.format() });
      return;
    }
    const result = await queryAuditLogs(prisma, parsed.data);
    res.json(result);
  });

  // GET /audit/:id — single row (admins only by router-level guard)
  router.get('/:id', async (req: AuthedRequest, res: Response) => {
    const idSchema = z.coerce.bigint();
    const parsed = idSchema.safeParse(req.params.id);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_id' });
      return;
    }
    const row = await prisma.auditLog.findUnique({ where: { id: parsed.data } });
    if (!row) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    res.json({
      ...row,
      id: row.id.toString(),
    });
  });

  // GET /audit/export.csv
  router.get('/export.csv', async (req: AuthedRequest, res: Response) => {
    const parsed = auditQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_query', details: parsed.error.format() });
      return;
    }
    // Cap export size to keep memory stable; admins can paginate exports.
    const result = await queryAuditLogs(prisma, {
      ...parsed.data,
      pageSize: Math.min(parsed.data.pageSize, 5000),
    });
    await writeAudit(prisma, {
      entityType: 'AuditLog',
      action: 'EXPORT',
      newValues: { format: 'csv', rows: result.rows.length, filters: parsed.data },
    });
    streamAuditCsv(res, result);
  });

  // GET /audit/export.pdf
  router.get('/export.pdf', async (req: AuthedRequest, res: Response) => {
    const parsed = auditQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_query', details: parsed.error.format() });
      return;
    }
    const result = await queryAuditLogs(prisma, {
      ...parsed.data,
      pageSize: Math.min(parsed.data.pageSize, 1000),
    });
    await writeAudit(prisma, {
      entityType: 'AuditLog',
      action: 'EXPORT',
      newValues: { format: 'pdf', rows: result.rows.length, filters: parsed.data },
    });
    streamAuditPdf(res, result);
  });

  return router;
}
