/**
 * סוכן שטח — קלט עם meta נוספת (ID סוכן, קומיסיון).
 */

import type { ChannelAdapter, NormalizedOrderInput } from './types';

export interface AgentRaw extends Omit<NormalizedOrderInput, 'channel'> {
  agentId: string;
  commissionPercent?: number;
}

export const agentAdapter: ChannelAdapter<AgentRaw> = {
  kind: 'AGENT',
  parse(raw) {
    if (!raw.agentId) {
      throw new Error('הזמנת סוכן חייבת לכלול agentId');
    }
    return {
      ...raw,
      channel: 'AGENT',
      takenBy: raw.takenBy ?? `agent:${raw.agentId}`,
    };
  },
};
