// פרופילי קול לעברית — Azure / Google
import type { VoiceProfile } from '../types.js';

export const VOICE_PROFILES = {
  hilaFormal: {
    name: 'he-IL-HilaNeural',
    gender: 'female',
    rate: 'medium',
    style: 'formal',
    language: 'he-IL',
  },
  hilaCasual: {
    name: 'he-IL-HilaNeural',
    gender: 'female',
    rate: 'medium',
    style: 'cheerful',
    language: 'he-IL',
  },
  avriFormal: {
    name: 'he-IL-AvriNeural',
    gender: 'male',
    rate: 'medium',
    style: 'formal',
    language: 'he-IL',
  },
  avriCasual: {
    name: 'he-IL-AvriNeural',
    gender: 'male',
    rate: 'medium',
    style: 'cheerful',
    language: 'he-IL',
  },
  hilaEmpathetic: {
    name: 'he-IL-HilaNeural',
    gender: 'female',
    rate: 'slow',
    style: 'empathetic',
    language: 'he-IL',
  },
} as const satisfies Record<string, VoiceProfile>;

export type VoiceProfileKey = keyof typeof VOICE_PROFILES;

export function profileFor(situation: 'greeting' | 'complaint' | 'confirmation' | 'goodbye'): VoiceProfile {
  switch (situation) {
    case 'greeting':
      return VOICE_PROFILES.hilaCasual;
    case 'complaint':
      return VOICE_PROFILES.hilaEmpathetic;
    case 'confirmation':
      return VOICE_PROFILES.hilaFormal;
    case 'goodbye':
      return VOICE_PROFILES.hilaCasual;
  }
}
