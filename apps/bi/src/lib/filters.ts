/**
 * Shared filter shape across all aggregation queries.
 * `officialOnly` is the requested "official-only" filter — when true,
 * only rows flagged isOfficial=true are included (used for tax/regulatory reports).
 */
export interface ReportFilter {
  from: Date;
  to: Date;
  agentId?: string;
  customerId?: string;
  category?: string;
  officialOnly?: boolean;
}

export function officialWhere(officialOnly?: boolean) {
  return officialOnly ? { isOfficial: true } : {};
}
