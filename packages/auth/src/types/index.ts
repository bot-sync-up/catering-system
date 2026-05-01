/**
 * Core auth types — תפקידים, רשומות, סשנים
 */

export type Category = 'official' | 'unofficial';

export type ListType = 'black' | 'white';

export type Role =
  | 'general_manager'   // מנהל כללי
  | 'finance'           // כספים
  | 'sales'             // מכירות
  | 'agent'             // סוכן
  | 'kitchen_manager'   // מטבח
  | 'kitchen_worker'    // עובד מטבח
  | 'operations'        // תפעול
  | 'shift_worker'      // עובד משמרת
  | 'driver'            // נהג
  | 'hr'                // HR
  | 'customer';         // לקוח

export const ALL_ROLES: Role[] = [
  'general_manager', 'finance', 'sales', 'agent',
  'kitchen_manager', 'kitchen_worker', 'operations',
  'shift_worker', 'driver', 'hr', 'customer',
];

export type Module =
  | 'users' | 'orders' | 'inventory' | 'finance'
  | 'kitchen' | 'delivery' | 'reports' | 'hr'
  | 'customers' | 'audit' | 'settings';

export type Action = 'create' | 'read' | 'update' | 'delete' | 'approve' | 'export' | 'list';

/** רמות הרשאה — module / action / field / record */
export type PermissionLevel = 'module' | 'action' | 'field' | 'record';

export interface Permission {
  level: PermissionLevel;
  module: Module;
  action?: Action;
  field?: string;          // למשל 'salary', 'bank_account'
  recordPredicate?: string; // ביטוי כמו "owner_id == :user.id"
  category: Category;       // official|unofficial
  list: ListType;           // black|white
}

export interface User {
  id: string;
  email: string;
  passwordHash: string | null;     // null עבור OAuth-only
  passwordAlgo: 'argon2id' | null;
  phone: string | null;
  fullName: string;
  roles: Role[];
  category: Category;
  totpSecretEnc: string | null;    // מוצפן AES-256-GCM
  smsOtpEnabled: boolean;
  twoFaEnabled: boolean;
  isActive: boolean;
  emailVerified: boolean;
  failedLoginCount: number;
  lockedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // שדות רגישים מוצפנים AES-256
  salaryEnc?: string | null;
  bankAccountEnc?: string | null;
  nationalIdEnc?: string | null;
}

export interface Session {
  id: string;
  userId: string;
  device: string;
  ip: string;
  userAgent: string;
  createdAt: number;
  lastSeenAt: number;
  expiresAt: number;
  twoFaPassed: boolean;
  revoked: boolean;
}

export interface AuthContext {
  user: User;
  session: Session;
  ip: string;
}

export interface OAuthProfile {
  provider: 'google' | 'facebook';
  providerUserId: string;
  email: string;
  fullName: string;
}

export interface PolicyDecision {
  allowed: boolean;
  reason?: string;
  matchedRule?: string;
}

export interface RolePermissions {
  role: Role;
  permissions: Permission[];
}
