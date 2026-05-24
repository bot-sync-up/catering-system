// סינתזת קול בעברית באמצעות Azure Speech (HilaNeural / AvriNeural)
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import type { TTSRequest, VoiceProfile } from '../types.js';

export interface AzureTTSConfig {
  subscriptionKey: string;
  region: string; // לדוגמה westeurope
}

export class AzureTTSHebrew {
  constructor(private cfg: AzureTTSConfig) {}

  async synthesize(req: TTSRequest): Promise<Buffer> {
    const speechConfig = sdk.SpeechConfig.fromSubscription(
      this.cfg.subscriptionKey,
      this.cfg.region
    );
    speechConfig.speechSynthesisOutputFormat =
      sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;
    speechConfig.speechSynthesisVoiceName = req.voice.name;

    const synthesizer = new sdk.SpeechSynthesizer(speechConfig);
    const ssml = req.ssml ? req.text : this.toSSML(req.text, req.voice);

    return new Promise((resolve, reject) => {
      synthesizer.speakSsmlAsync(
        ssml,
        (result) => {
          synthesizer.close();
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            resolve(Buffer.from(result.audioData));
          } else {
            reject(new Error(`Azure TTS failed: ${result.errorDetails}`));
          }
        },
        (err) => {
          synthesizer.close();
          reject(err);
        }
      );
    });
  }

  private toSSML(text: string, voice: VoiceProfile): string {
    const rate = voice.rate === 'slow' ? '-15%' : voice.rate === 'fast' ? '+15%' : '0%';
    const style = voice.style === 'formal' ? 'newscast' : voice.style;
    const safe = escapeXml(text);
    return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
  xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${voice.language}">
  <voice name="${voice.name}">
    <mstts:express-as style="${style}">
      <prosody rate="${rate}">${safe}</prosody>
    </mstts:express-as>
  </voice>
</speak>`;
  }
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
