// Handler אחוד ל-webhooks של טלפוניה — Twilio (TwiML) ו-IP019/SIP
import Fastify, { type FastifyInstance } from 'fastify';
import { TwilioVoice } from './TwilioVoice.js';
import { Ip019Pbx } from './Ip019Pbx.js';

export interface WebhookDeps {
  twilio?: TwilioVoice;
  ip019?: Ip019Pbx;
  wsStreamUrl: string;
  onCallStart: (callSid: string, ctx: { from: string; to: string }) => void | Promise<void>;
  onCallEnd: (callSid: string) => void | Promise<void>;
  onDtmf?: (callSid: string, digit: string) => void | Promise<void>;
}

export function createWebhookServer(deps: WebhookDeps): FastifyInstance {
  const app = Fastify({ logger: true });

  // Twilio — TwiML על קבלת שיחה
  app.post('/voice/answer', async (req, reply) => {
    if (!deps.twilio) return reply.code(503).send('twilio disabled');
    const body = req.body as Record<string, string>;
    const ctx = deps.twilio.fromWebhookPayload(body);
    await deps.onCallStart(ctx.callSid, { from: ctx.from, to: ctx.to });
    const twiml = deps.twilio.buildAnswerTwiML(ctx.callSid, deps.wsStreamUrl);
    reply.header('Content-Type', 'text/xml').send(twiml);
  });

  app.post('/voice/status', async (req, reply) => {
    const body = req.body as Record<string, string>;
    if (body.CallStatus === 'completed' && body.CallSid) {
      await deps.onCallEnd(body.CallSid);
    }
    reply.send({ ok: true });
  });

  // IP019 — webhook אירועי שיחה
  app.post('/pbx/ip019/event', async (req, reply) => {
    if (!deps.ip019) return reply.code(503).send('ip019 disabled');
    const evt = deps.ip019.parseWebhook(req.body as Record<string, unknown>);
    if (evt.event === 'answered') await deps.onCallStart(evt.callId, { from: evt.from, to: evt.to });
    if (evt.event === 'hangup') await deps.onCallEnd(evt.callId);
    if (evt.event === 'dtmf' && evt.dtmf && deps.onDtmf) await deps.onDtmf(evt.callId, evt.dtmf);
    reply.send({ ok: true });
  });

  // health
  app.get('/healthz', async () => ({ ok: true }));

  return app;
}
