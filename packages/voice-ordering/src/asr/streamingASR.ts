// Streaming ASR — מצטבר chunks ושולח לתמלול חלקי
// תומך ב-providers שונים (Whisper בקבצים קצרים, Deepgram/Azure בזרימה אמיתית)
import { EventEmitter } from 'node:events';
import type { AudioChunk, TranscriptSegment } from '../types.js';

export interface StreamingASRProvider {
  start(): Promise<void>;
  send(chunk: AudioChunk): void;
  end(): Promise<TranscriptSegment[]>;
}

export interface StreamingASROptions {
  provider: StreamingASRProvider;
  /** השהיה לפני שמכריזים על שתיקה (ms) */
  vadSilenceMs?: number;
  /** סף RMS בין 0 ל-1 שמתחתיו נחשב שתיקה */
  vadEnergyThreshold?: number;
}

export class StreamingASR extends EventEmitter {
  private lastVoiceAt = Date.now();
  private active = false;

  constructor(private opts: StreamingASROptions) {
    super();
  }

  async start(): Promise<void> {
    this.active = true;
    await this.opts.provider.start();
    this.emit('start');
  }

  feed(chunk: AudioChunk): void {
    if (!this.active) return;
    this.opts.provider.send(chunk);

    const energy = computeRms(chunk);
    if (energy > (this.opts.vadEnergyThreshold ?? 0.02)) {
      this.lastVoiceAt = Date.now();
      this.emit('voice');
    } else if (Date.now() - this.lastVoiceAt > (this.opts.vadSilenceMs ?? 800)) {
      this.emit('silence');
    }
  }

  /** מסיים את הסשן ומחזיר תמלולים סופיים */
  async end(): Promise<TranscriptSegment[]> {
    this.active = false;
    const segs = await this.opts.provider.end();
    this.emit('end', segs);
    return segs;
  }

  partial(segment: TranscriptSegment): void {
    this.emit('partial', segment);
  }
}

function computeRms(chunk: AudioChunk): number {
  if (chunk.format !== 'pcm16') return 0;
  const view = new Int16Array(
    chunk.data.buffer,
    chunk.data.byteOffset,
    chunk.data.byteLength / 2
  );
  let sum = 0;
  for (let i = 0; i < view.length; i++) sum += view[i] * view[i];
  const rms = Math.sqrt(sum / view.length) / 32768;
  return rms;
}
