// סינתזת קול עברית באמצעות Google Cloud TTS — fallback ל-Azure
import textToSpeech from '@google-cloud/text-to-speech';
import type { TTSRequest } from '../types.js';

export interface GoogleTTSConfig {
  keyFilename?: string;
  credentials?: { client_email: string; private_key: string };
}

export class GoogleTTSHebrew {
  private client: InstanceType<typeof textToSpeech.TextToSpeechClient>;

  constructor(cfg: GoogleTTSConfig = {}) {
    // ClientOptions של Google הוא ממשק רחב עם index signature — cast מבוקר
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.client = new textToSpeech.TextToSpeechClient(cfg as any);
  }

  async synthesize(req: TTSRequest): Promise<Buffer> {
    const rate = req.voice.rate === 'slow' ? 0.85 : req.voice.rate === 'fast' ? 1.15 : 1.0;
    // שמות הקול של Google לעברית: he-IL-Wavenet-A/B/C/D
    const voiceName = mapVoiceName(req.voice.name);
    const [response] = await this.client.synthesizeSpeech({
      input: req.ssml ? { ssml: req.text } : { text: req.text },
      voice: {
        languageCode: 'he-IL',
        name: voiceName,
        ssmlGender:
          req.voice.gender === 'female' ? ('FEMALE' as const) : ('MALE' as const),
      },
      audioConfig: { audioEncoding: 'MP3' as const, speakingRate: rate },
    });
    if (!response.audioContent) throw new Error('Google TTS empty response');
    return Buffer.from(response.audioContent as Uint8Array);
  }
}

function mapVoiceName(azureName: string): string {
  // ממפה שם של Azure ל-Google
  if (azureName.includes('Hila')) return 'he-IL-Wavenet-A';
  if (azureName.includes('Avri')) return 'he-IL-Wavenet-B';
  return 'he-IL-Wavenet-A';
}
