// CallSession — מארגן ASR + NLU + Dialog + TTS ל-flow אחיד
import { EventEmitter } from 'node:events';
import type { AudioChunk, CallContext, DialogTurn, TranscriptSegment } from '../types.js';
import { TurnTakingDetector } from './turnTakingDetector.js';
import { WhisperASR } from '../asr/WhisperASR.js';
import { postProcessHebrewASR } from '../asr/HebrewASRPostProcessor.js';
import { IntentClassifier } from '../nlu/IntentClassifier.js';
import { EntityExtractor } from '../nlu/EntityExtractor.js';
import { startOrderDialog, promptForState, type OrderActor } from '../dialog/OrderDialog.js';
import { AzureTTSHebrew } from '../tts/AzureTTSHebrew.js';
import { GoogleTTSHebrew } from '../tts/GoogleTTSHebrew.js';
import { profileFor } from '../tts/voiceProfiles.js';
import { decideEscalation, type EscalationConfig } from './escalation.js';

export interface CallSessionDeps {
  asr: WhisperASR;
  intent: IntentClassifier;
  entities: EntityExtractor;
  ttsPrimary: AzureTTSHebrew;
  ttsFallback?: GoogleTTSHebrew;
  escalation: EscalationConfig;
}

export class CallSession extends EventEmitter {
  private audioBuffer: Buffer[] = [];
  private turnDetector = new TurnTakingDetector({ silenceMs: 800 });
  private dialog: OrderActor;
  private transcript: DialogTurn[] = [];
  private failedAttempts = 0;
  private active = true;

  constructor(public ctx: CallContext, private deps: CallSessionDeps) {
    super();
    this.dialog = startOrderDialog(ctx.callSid);
    this.turnDetector.on('turn-end', () => this.processTurn());
  }

  /** ברכה ראשונית מהבוט בתחילת השיחה */
  async start(): Promise<void> {
    const text = promptForState('greeting', this.dialog.getSnapshot().context);
    await this.speak(text, 'greeting');
    this.recordTurn('bot', text);
  }

  feed(chunk: AudioChunk): void {
    if (!this.active) return;
    this.audioBuffer.push(chunk.data);
    this.turnDetector.feed(chunk);
  }

  /** מסיים את השיחה ומחזיר transcript מלא */
  async end(): Promise<DialogTurn[]> {
    this.active = false;
    this.emit('end', this.transcript);
    return this.transcript;
  }

  private async processTurn(): Promise<void> {
    if (!this.active || this.audioBuffer.length === 0) return;
    const buf = Buffer.concat(this.audioBuffer);
    this.audioBuffer = [];

    try {
      const segs = await this.deps.asr.transcribeFile(buf, `${this.ctx.callSid}.wav`);
      const rawText = segs.map((s) => s.text).join(' ').trim();
      if (!rawText) return;

      const cleaned = postProcessHebrewASR(rawText);
      this.recordTurn('user', cleaned);
      this.emit('user-said', cleaned, segs as TranscriptSegment[]);

      const [intent, entities] = await Promise.all([
        this.deps.intent.classify(cleaned),
        this.deps.entities.extract(cleaned),
      ]);

      // טיפול בבקשה מפורשת לנציג
      if (intent.intent === 'HUMAN_HELP') {
        const dec = decideEscalation(
          { failedAttempts: this.failedAttempts, explicitRequest: true },
          this.deps.escalation
        );
        await this.speak(dec.handoffMessage, 'greeting');
        this.recordTurn('bot', dec.handoffMessage);
        this.emit('escalate', dec);
        return;
      }

      // הזנת מכונת המצבים
      this.dialog.send({ type: 'USER_INPUT', text: cleaned, entities });

      const snapshot = this.dialog.getSnapshot();
      const stateName = String(snapshot.value);

      // בדיקה אם התקדמנו או נתקענו
      const lastUserField = Object.keys(entities).length;
      if (lastUserField === 0) this.failedAttempts++;
      else this.failedAttempts = 0;

      const dec = decideEscalation(
        { failedAttempts: this.failedAttempts },
        this.deps.escalation
      );
      if (dec.shouldEscalate) {
        await this.speak(dec.handoffMessage, 'complaint');
        this.recordTurn('bot', dec.handoffMessage);
        this.emit('escalate', dec);
        return;
      }

      const reply = promptForState(stateName, snapshot.context);
      const situation = stateName === 'goodbye' ? 'goodbye' : stateName === 'confirm' ? 'confirmation' : 'greeting';
      await this.speak(reply, situation);
      this.recordTurn('bot', reply);

      if (snapshot.status === 'done') {
        await this.end();
      }
    } catch (err) {
      this.emit('error', err);
    }
  }

  private async speak(text: string, situation: 'greeting' | 'complaint' | 'confirmation' | 'goodbye'): Promise<void> {
    const voice = profileFor(situation);
    try {
      const audio = await this.deps.ttsPrimary.synthesize({ text, voice });
      this.emit('bot-audio', audio);
    } catch (err) {
      if (this.deps.ttsFallback) {
        const audio = await this.deps.ttsFallback.synthesize({ text, voice });
        this.emit('bot-audio', audio);
      } else {
        throw err;
      }
    }
  }

  private recordTurn(speaker: 'user' | 'bot', text: string): void {
    this.transcript.push({ speaker, text, timestamp: Date.now() });
  }
}
