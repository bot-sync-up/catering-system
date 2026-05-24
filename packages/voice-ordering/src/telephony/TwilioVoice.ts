// אינטגרציה עם Twilio Voice API + TwiML
import twilio from 'twilio';
import type { CallContext } from '../types.js';

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  webhookBaseUrl: string;
}

export class TwilioVoice {
  private client: twilio.Twilio;

  constructor(private cfg: TwilioConfig) {
    this.client = twilio(cfg.accountSid, cfg.authToken);
  }

  /** מבצע שיחה יוצאת ומחזיר CallSid */
  async dialOut(to: string, opts: { statusCallback?: string; record?: boolean } = {}): Promise<string> {
    const call = await this.client.calls.create({
      to,
      from: this.cfg.fromNumber,
      url: `${this.cfg.webhookBaseUrl}/voice/answer`,
      statusCallback: opts.statusCallback,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      record: opts.record ?? false,
    });
    return call.sid;
  }

  /** בונה TwiML לקבלת שיחה נכנסת — מצמיד WebSocket לזרימת אודיו דו-כיוונית */
  buildAnswerTwiML(callSid: string, wsUrl: string): string {
    const response = new twilio.twiml.VoiceResponse();
    const connect = response.connect();
    connect.stream({ url: wsUrl, name: `stream-${callSid}` });
    return response.toString();
  }

  /** TwiML לניתוק */
  buildHangupTwiML(message?: string): string {
    const response = new twilio.twiml.VoiceResponse();
    if (message) response.say({ language: 'he-IL' }, message);
    response.hangup();
    return response.toString();
  }

  /** TwiML להעברה לנציג אנושי */
  buildTransferTwiML(target: string, holdMessage = 'מעביר אותך לנציג, רגע בבקשה.'): string {
    const response = new twilio.twiml.VoiceResponse();
    response.say({ language: 'he-IL' }, holdMessage);
    response.dial(target);
    return response.toString();
  }

  fromWebhookPayload(body: Record<string, string>): CallContext {
    return {
      callSid: body.CallSid,
      from: body.From,
      to: body.To,
      startedAt: new Date(),
      direction: body.Direction === 'inbound' ? 'inbound' : 'outbound',
      recordingEnabled: body.RecordingUrl != null,
      language: 'he-IL',
    };
  }
}
