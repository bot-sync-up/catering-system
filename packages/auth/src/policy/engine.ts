/**
 * Policy Engine — מקבל פעולה והקשר ומחזיר decision.
 * סדר הערכה:
 *   1. blacklist (deny) הכי ספציפי קודם — record > field > action > module
 *   2. whitelist (allow) — אם לא נחסם
 *   3. ברירת מחדל: deny.
 * תומך ב-category: official | unofficial.
 */
import { Permission, Module, Action, AuthContext, PolicyDecision, Category } from '../types';
import { getPermissions } from '../rbac/roles';

export interface AccessRequest {
  ctx: AuthContext;
  module: Module;
  action: Action;
  field?: string;
  record?: Record<string, unknown>;
  category?: Category; // ברירת מחדל official
}

const SPECIFICITY: Record<Permission['level'], number> = {
  record: 4, field: 3, action: 2, module: 1,
};

function matches(p: Permission, req: AccessRequest): boolean {
  if (p.module !== req.module) return false;
  const cat = req.category ?? 'official';
  if (p.category !== cat) return false;
  if (p.level === 'module') return true;
  if (p.level === 'action') return p.action === req.action;
  if (p.level === 'field') return req.field !== undefined && p.field === req.field;
  if (p.level === 'record') {
    if (!req.record || !p.recordPredicate) return false;
    return evalPredicate(p.recordPredicate, req);
  }
  return false;
}

/**
 * הערכת predicate פשוטה ובטוחה — תחביר: "<field> <op> :user.<key>"
 * ops: == != >= <= > <
 * אין eval של JS — רק parser מינימלי, מה שמונע injection.
 */
export function evalPredicate(predicate: string, req: AccessRequest): boolean {
  const m = predicate.match(/^\s*(\w+)\s*(==|!=|>=|<=|>|<)\s*:user\.(\w+)\s*$/);
  if (!m) return false;
  const [, field, op, userKey] = m;
  const left = req.record?.[field];
  const right = (req.ctx.user as unknown as Record<string, unknown>)[userKey];
  switch (op) {
    case '==': return left === right;
    case '!=': return left !== right;
    case '>=': return Number(left) >= Number(right);
    case '<=': return Number(left) <= Number(right);
    case '>':  return Number(left) >  Number(right);
    case '<':  return Number(left) <  Number(right);
  }
  return false;
}

export function decide(req: AccessRequest): PolicyDecision {
  const perms = getPermissions(req.ctx.user.roles);
  const matching = perms.filter(p => matches(p, req));

  if (matching.length === 0) {
    return { allowed: false, reason: 'no matching rule' };
  }

  // הכי ספציפי קודם
  matching.sort((a, b) => SPECIFICITY[b.level] - SPECIFICITY[a.level]);
  const top = matching[0];

  // אם blacklist הכי ספציפי — מסרב
  if (top.list === 'black') {
    return { allowed: false, reason: `denied by blacklist on ${top.level}`, matchedRule: ruleId(top) };
  }

  // יש whitelist — מאשר. לבדוק עם זאת אין blacklist באותה רמה הספציפית
  const sameLevelBlack = matching.find(p => p.level === top.level && p.list === 'black');
  if (sameLevelBlack) {
    return { allowed: false, reason: `denied by blacklist same level`, matchedRule: ruleId(sameLevelBlack) };
  }

  return { allowed: true, matchedRule: ruleId(top) };
}

function ruleId(p: Permission): string {
  return `${p.level}:${p.module}:${p.action ?? ''}:${p.field ?? ''}:${p.list}:${p.category}`;
}

/** עוטף — בודק שניתן לקרוא שדה (filter projection) */
export function canReadField(ctx: AuthContext, module: Module, field: string): boolean {
  return decide({ ctx, module, action: 'read', field }).allowed;
}

/** מסנן שדות רגישים מ-payload לפי policy */
export function filterFields<T extends Record<string, unknown>>(
  ctx: AuthContext,
  module: Module,
  obj: T
): Partial<T> {
  const out: Partial<T> = {};
  for (const k of Object.keys(obj) as (keyof T)[]) {
    if (canReadField(ctx, module, String(k))) {
      out[k] = obj[k];
    }
  }
  return out;
}
