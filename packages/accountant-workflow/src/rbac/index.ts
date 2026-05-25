/**
 * הרשאות פורטל הרו"ח.
 *  - accountant: צפייה והורדה של קבצים שהושלמו (status != 'pending').
 *    יכול לסמן "הוגש" + להקליד מספר אסמכתא.
 *    אינו רשאי לערוך תוכן קובץ, אינו רשאי לשנות מצב TAX_REPORTING_MODE.
 *  - general-manager: הכל. יכול לשנות מצב דיווח.
 *  - staff: אין גישה לפורטל.
 */
import { AccountantRole, GeneratedFile } from '../types';

export type Permission =
  | 'portal.view'
  | 'file.download'
  | 'file.mark-submitted'
  | 'file.delete'
  | 'config.change-mode'
  | 'audit.view';

export const PERMISSIONS_BY_ROLE: Record<AccountantRole['role'], Permission[]> = {
  accountant: ['portal.view', 'file.download', 'file.mark-submitted', 'audit.view'],
  'general-manager': [
    'portal.view',
    'file.download',
    'file.mark-submitted',
    'file.delete',
    'config.change-mode',
    'audit.view',
  ],
  staff: [],
};

export function canPerform(role: AccountantRole, action: Permission): boolean {
  return PERMISSIONS_BY_ROLE[role.role]?.includes(action) ?? false;
}

export class ForbiddenError extends Error {
  constructor(role: AccountantRole, action: Permission) {
    super(`Role "${role.role}" cannot perform "${action}"`);
    this.name = 'ForbiddenError';
  }
}

export function require(role: AccountantRole, action: Permission): void {
  if (!canPerform(role, action)) throw new ForbiddenError(role, action);
}

/**
 * רו"ח רואה רק קבצים שאינם pending.
 */
export function filterFilesForRole(role: AccountantRole, files: GeneratedFile[]): GeneratedFile[] {
  if (role.role === 'accountant') {
    return files.filter((f) => f.status !== 'pending');
  }
  if (role.role === 'general-manager') {
    return files;
  }
  return [];
}
