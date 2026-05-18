export type Role =
  | 'manager'
  | 'agent'
  | 'kitchen'
  | 'shift'
  | 'driver'
  | 'customer';

export interface User {
  id: string;
  name: string;
  role: Role;
  phone?: string;
  email?: string;
  branchId?: string;
}

export interface Geofence {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number; // meters
}

export interface SyncStatus {
  lastSyncAt: number | null;
  pending: number;
  inProgress: boolean;
  online: boolean;
}

export type ConflictResolution = 'last-write-wins';

export interface ConflictFlag {
  table: string;
  recordId: string;
  reason: string;
  at: number;
}
