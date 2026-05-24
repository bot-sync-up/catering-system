// העברה לנציג עם hold music אופציונלי
import twilio from 'twilio';

export interface TransferOptions {
  agentNumber: string;
  holdMessage?: string;
  holdMusicUrl?: string;
  timeout?: number;
  recordTransfer?: boolean;
  callerId?: string;
}

export function buildTransferTwiML(opts: TransferOptions): string {
  const response = new twilio.twiml.VoiceResponse();
  if (opts.holdMessage) {
    response.say({ language: 'he-IL' }, opts.holdMessage);
  }
  const dial = response.dial({
    timeout: opts.timeout ?? 30,
    callerId: opts.callerId,
    record: opts.recordTransfer ? 'record-from-answer' : undefined,
  });
  dial.number(opts.agentNumber);
  response.say({ language: 'he-IL' }, 'הנציג לא זמין כרגע. נחזור אליך בהקדם.');
  response.hangup();
  return response.toString();
}
