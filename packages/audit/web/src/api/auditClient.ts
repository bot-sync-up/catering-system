// Thin client for the audit API. The browser stores the JWT in localStorage
// under "auth.token" — populated by the existing login flow elsewhere in
// the platform. All admin-only endpoints require a GENERAL_ADMIN token.

export interface AuditRow {
  id: string;
  userId: string | null;
  entityType: string;
  entityId: string | null;
  action: string;
  oldValues: unknown;
  newValues: unknown;
  ip: string | null;
  userAgent: string | null;
  timestamp: string;
  tenantId: string | null;
}

export interface AuditQuery {
  q?: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  ip?: string;
  tenantId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
  sort?: 'asc' | 'desc';
}

function authHeaders(): HeadersInit {
  const t = localStorage.getItem('auth.token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function buildUrl(base: string, params: AuditQuery): string {
  const u = new URL(base, window.location.origin);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      u.searchParams.set(k, String(v));
    }
  }
  return u.toString();
}

export async function fetchAuditLogs(params: AuditQuery): Promise<{
  total: number;
  page: number;
  pageSize: number;
  rows: AuditRow[];
}> {
  const url = buildUrl('/api/audit', params);
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error(`failed: ${res.status}`);
  return res.json();
}

export function exportCsvUrl(params: AuditQuery): string {
  return buildUrl('/api/audit/export.csv', params);
}

export function exportPdfUrl(params: AuditQuery): string {
  return buildUrl('/api/audit/export.pdf', params);
}
