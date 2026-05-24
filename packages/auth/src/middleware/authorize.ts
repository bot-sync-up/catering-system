/**
 * Authorization middleware — נשען על policy engine
 */
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { decide } from '../policy/engine';
import { Module, Action, Category } from '../types';

export interface AuthorizeOpts {
  module: Module;
  action: Action;
  field?: string;
  category?: Category;
  recordFromReq?: (req: Request) => Record<string, unknown> | undefined;
}

export function authorize(opts: AuthorizeOpts): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) return res.status(401).json({ error: 'לא מחובר' });
    const decision = decide({
      ctx: req.auth,
      module: opts.module,
      action: opts.action,
      field: opts.field,
      category: opts.category,
      record: opts.recordFromReq?.(req),
    });
    if (!decision.allowed) {
      return res.status(403).json({ error: 'אין הרשאה', reason: decision.reason });
    }
    next();
  };
}
