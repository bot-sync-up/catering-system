import { describe, expect, it, vi } from 'vitest';
import { CallSession } from '../src/call/CallSession.js';
import type { CallContext } from '../src/types.js';

// Mock minimalי לכל התלויות החיצוניות
function makeMockedDeps() {
  return {
    asr: {
      transcribeFile: vi.fn().mockResolvedValue([
        { text: 'אני רוצה להזמין חתונה', startMs: 0, endMs: 1000, confidence: 0.95, isFinal: true, language: 'he' },
      ]),
    } as any,
    intent: {
      classify: vi.fn().mockResolvedValue({ intent: 'ORDER_NEW', confidence: 0.9 }),
    } as any,
    entities: {
      extract: vi.fn().mockResolvedValue({ eventType: 'wedding' }),
    } as any,
    ttsPrimary: {
      synthesize: vi.fn().mockResolvedValue(Buffer.from('mp3-data')),
    } as any,
    escalation: { agentNumber: '+972500000000', maxFailedAttempts: 3 },
  };
}

describe('CallSession', () => {
  const ctx: CallContext = {
    callSid: 'CA123',
    from: '+972501234567',
    to: '+972500000000',
    startedAt: new Date(),
    direction: 'inbound',
    recordingEnabled: false,
    language: 'he-IL',
  };

  it('משמיע ברכה בהתחלה', async () => {
    const deps = makeMockedDeps();
    const sess = new CallSession(ctx, deps);
    const audioFired = vi.fn();
    sess.on('bot-audio', audioFired);
    await sess.start();
    expect(audioFired).toHaveBeenCalled();
    expect(deps.ttsPrimary.synthesize).toHaveBeenCalled();
  });

  it('מטפל בבקשה לנציג', async () => {
    const deps = makeMockedDeps();
    deps.intent.classify = vi.fn().mockResolvedValue({ intent: 'HUMAN_HELP', confidence: 0.95 });
    const sess = new CallSession(ctx, deps);
    const escalated = vi.fn();
    sess.on('escalate', escalated);
    await sess.start();
    // הזרם chunk כדי לעורר processTurn
    sess.feed({
      data: Buffer.alloc(800 * 2),
      format: 'pcm16',
      sampleRate: 16000,
      timestamp: Date.now(),
    });
    // קרא processTurn ידנית כדי לעקוף VAD
    // @ts-expect-error — גישה פרטית לטסט
    await sess.processTurn();
    expect(escalated).toHaveBeenCalled();
  });
});
