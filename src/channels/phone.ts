/**
 * טלפון — קלט שהוזן ידנית ע"י קלידן.
 * דורש שדה `takenBy` (מי הקלידן) להיות מוגדר.
 */

import type { ChannelAdapter, NormalizedOrderInput } from './types';

export interface PhoneRaw extends Omit<NormalizedOrderInput, 'channel'> {
  takenBy: string;
}

export const phoneAdapter: ChannelAdapter<PhoneRaw> = {
  kind: 'PHONE',
  parse(raw) {
    if (!raw.takenBy || raw.takenBy.trim() === '') {
      throw new Error('להזמנה טלפונית חובה לציין את שם הקלידן (takenBy)');
    }
    return { ...raw, channel: 'PHONE' };
  },
};
