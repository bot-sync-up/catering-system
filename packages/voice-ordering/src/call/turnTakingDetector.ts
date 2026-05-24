// VAD פשוט לזיהוי גבולות תור — מתי המשתמש סיים לדבר
import { EventEmitter } from 'node:events';
import type { AudioChunk } from '../types.js';

export interface TurnTakingOptions {
  silenceMs?: number; // משך שתיקה לפני שמסיק שהמשתמש סיים
  energyThreshold?: number; // 0-1
  minSpeechMs?: number; // משך מינימלי של דיבור לפני שמשמיע "voice"
}

export class TurnTakingDetector extends EventEmitter {
  private lastVoiceAt = 0;
  private speechStartedAt = 0;
  private isSpeaking = false;
  private silenceTimer: NodeJS.Timeout | null = null;

  constructor(private opts: TurnTakingOptions = {}) {
    super();
  }

  feed(chunk: AudioChunk): void {
    const energy = computeRms(chunk);
    const now = Date.now();
    if (energy > (this.opts.energyThreshold ?? 0.02)) {
      this.lastVoiceAt = now;
      if (!this.isSpeaking) {
        this.speechStartedAt = now;
        this.isSpeaking = true;
        this.emit('speech-start');
      }
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }
    } else if (this.isSpeaking) {
      const silenceMs = this.opts.silenceMs ?? 800;
      if (!this.silenceTimer) {
        this.silenceTimer = setTimeout(() => {
          const speechDuration = this.lastVoiceAt - this.speechStartedAt;
          this.isSpeaking = false;
          this.silenceTimer = null;
          if (speechDuration >= (this.opts.minSpeechMs ?? 200)) {
            this.emit('turn-end', { durationMs: speechDuration });
          }
        }, silenceMs);
      }
    }
  }

  reset(): void {
    this.isSpeaking = false;
    this.lastVoiceAt = 0;
    this.speechStartedAt = 0;
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }
}

function computeRms(chunk: AudioChunk): number {
  if (chunk.format !== 'pcm16') {
    // הערכה גסה ל-mulaw — נצא מנקודת הנחה שיש דיבור
    return chunk.data.length > 100 ? 0.05 : 0;
  }
  const view = new Int16Array(
    chunk.data.buffer,
    chunk.data.byteOffset,
    chunk.data.byteLength / 2
  );
  let sum = 0;
  for (let i = 0; i < view.length; i++) sum += view[i] * view[i];
  return Math.sqrt(sum / view.length) / 32768;
}
