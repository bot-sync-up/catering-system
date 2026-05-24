import { stringify } from 'csv-stringify';
import type { Response } from 'express';
import type { AuditQueryResult } from '../api/auditQuery';

/**
 * Streams the audit query result as CSV with a UTF-8 BOM (so Excel opens
 * Hebrew correctly without mojibake).
 */
export function streamAuditCsv(res: Response, data: AuditQueryResult, filename = 'audit-log.csv'): void {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  // UTF-8 BOM — Excel needs this to interpret Hebrew correctly
  res.write('﻿');

  const stringifier = stringify({
    header: true,
    columns: [
      { key: 'id', header: 'מזהה' },
      { key: 'timestamp', header: 'תאריך ושעה' },
      { key: 'userId', header: 'משתמש' },
      { key: 'action', header: 'פעולה' },
      { key: 'entityType', header: 'סוג ישות' },
      { key: 'entityId', header: 'מזהה ישות' },
      { key: 'ip', header: 'כתובת IP' },
      { key: 'userAgent', header: 'דפדפן' },
      { key: 'tenantId', header: 'לקוח' },
      { key: 'oldValues', header: 'ערכים קודמים' },
      { key: 'newValues', header: 'ערכים חדשים' },
    ],
  });
  stringifier.pipe(res);

  for (const r of data.rows) {
    stringifier.write({
      id: r.id,
      timestamp: r.timestamp.toISOString(),
      userId: r.userId ?? '',
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId ?? '',
      ip: r.ip ?? '',
      userAgent: r.userAgent ?? '',
      tenantId: r.tenantId ?? '',
      oldValues: r.oldValues ? JSON.stringify(r.oldValues) : '',
      newValues: r.newValues ? JSON.stringify(r.newValues) : '',
    });
  }
  stringifier.end();
}
