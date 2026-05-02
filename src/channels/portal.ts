/**
 * פורטל לקוח — קלט כבר מובנה (טופס JSON).
 */

import type { ChannelAdapter, NormalizedOrderInput } from './types';

export interface PortalRaw extends Omit<NormalizedOrderInput, 'channel'> {}

export const portalAdapter: ChannelAdapter<PortalRaw> = {
  kind: 'PORTAL',
  parse(raw) {
    return { ...raw, channel: 'PORTAL' };
  },
};
