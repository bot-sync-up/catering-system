import { describe, expect, it, vi } from 'vitest';
import { TurnTakingDetector } from '../src/call/turnTakingDetector.js';
import type { AudioChunk } from '../src/types.js';

function makeChunk(amplitude: number, samples = 800): AudioChunk {
  const buf = Buffer.alloc(samples * 2);
  for (let i = 0; i < samples; i++) buf.writeInt16LE(amplitude, i * 2);
  return { data: buf, format: 'pcm16', sampleRate: 16000, timestamp: Date.now() };
}

describe('TurnTakingDetector', () => {
  it('מזהה תחילת דיבור', () => {
    const det = new TurnTakingDetector({ silenceMs: 100, energyThreshold: 0.01 });
    const start = vi.fn();
    det.on('speech-start', start);
    det.feed(makeChunk(8000));
    expect(start).toHaveBeenCalled();
  });

  it('מזהה סיום תור אחרי שתיקה', async () => {
    const det = new TurnTakingDetector({ silenceMs: 50, energyThreshold: 0.01, minSpeechMs: 0 });
    const end = vi.fn();
    det.on('turn-end', end);
    det.feed(makeChunk(8000));
    await new Promise((r) => setTimeout(r, 20));
    det.feed(makeChunk(0));
    await new Promise((r) => setTimeout(r, 100));
    expect(end).toHaveBeenCalled();
  });
});
