import { randomUUID } from 'crypto';
import { config } from '../lib/config';
import { makeClient, useMocks } from './http';

const http = makeClient(config.services.staff);

export interface StaffAssignment {
  id: string;
  eventId: string;
  role: 'waiter' | 'chef' | 'sous' | 'bartender' | 'manager';
  count: number;
  assignedIds: string[];
}

export const staffClient = {
  async assignTeam(eventId: string, plan: { role: StaffAssignment['role']; count: number }[]): Promise<StaffAssignment[]> {
    if (useMocks()) {
      return plan.map((p) => ({
        id: `asgn_${randomUUID().slice(0, 6)}`,
        eventId,
        role: p.role,
        count: p.count,
        assignedIds: Array.from({ length: p.count }, () => `emp_${randomUUID().slice(0, 4)}`),
      }));
    }
    const { data } = await http.post(`/events/${eventId}/staff`, { plan });
    return data;
  },

  async releaseTeam(eventId: string): Promise<{ released: number }> {
    if (useMocks()) return { released: 0 };
    const { data } = await http.post(`/events/${eventId}/staff/release`);
    return data;
  },
};
