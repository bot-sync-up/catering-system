// Auth package — sessions, JWT, role checks. To be implemented.
export const AUTH_VERSION = '0.0.1';

export type Role = 'admin' | 'rabbi' | 'editor' | 'user';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}
