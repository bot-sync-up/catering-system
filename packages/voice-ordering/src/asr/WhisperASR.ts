// תמלול בעברית באמצעות OpenAI Whisper
import OpenAI from 'openai';
import type { TranscriptSegment } from '../types.js';

export interface WhisperConfig {
  apiKey: string;
  model?: 'whisper-1';
  prompt?: string; // היסוס דומיין — שמות אולמות/אירועים בעברית
}

export class WhisperASR {
  private client: OpenAI;

  constructor(private cfg: WhisperConfig) {
    this.client = new OpenAI({ apiKey: cfg.apiKey });
  }

  /** תמלול קובץ מלא — לטובת סשנים שלמים והקלטות */
  async transcribeFile(
    file: File | Blob | Buffer,
    filename = 'audio.wav'
  ): Promise<TranscriptSegment[]> {
    // ממיר Buffer ל-File על ידי העתקה ל-Uint8Array — נמנע מ-SharedArrayBuffer
    const f =
      file instanceof Buffer
        ? new File([new Uint8Array(file)], filename, { type: 'audio/wav' })
        : (file as File);

    const result = await this.client.audio.transcriptions.create({
      file: f,
      model: this.cfg.model ?? 'whisper-1',
      language: 'he',
      response_format: 'verbose_json',
      prompt: this.cfg.prompt ?? 'הזמנת אירועים בעברית, אולם, חתונה, בר מצווה, ברית, צמחוני, כשרות.',
    });

    const segments = (result as unknown as { segments?: Array<{ text: string; start: number; end: number; avg_logprob?: number }> }).segments;
    if (!segments) {
      return [
        {
          text: result.text,
          startMs: 0,
          endMs: 0,
          confidence: 1,
          isFinal: true,
          language: 'he',
        },
      ];
    }
    return segments.map((s) => ({
      text: s.text.trim(),
      startMs: Math.round(s.start * 1000),
      endMs: Math.round(s.end * 1000),
      confidence: s.avg_logprob != null ? Math.max(0, Math.min(1, Math.exp(s.avg_logprob))) : 0.8,
      isFinal: true,
      language: 'he',
    }));
  }
}
