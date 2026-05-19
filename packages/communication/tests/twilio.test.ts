import nock from 'nock';
import { TwilioProvider } from '../src/sms/TwilioProvider';
import { Message } from '../src/types';

const BASE = 'https://api.twilio.com';
const SID = 'AC1234567890';

const message: Message = {
  channel: 'sms',
  to: { address: '+972501234567', tenantId: 't1', userId: 'u1' },
  body: 'שלום',
};

describe('TwilioProvider', () => {
  afterEach(() => nock.cleanAll());

  it('posts to messages.json and returns SID', async () => {
    nock(BASE)
      .post(`/2010-04-01/Accounts/${SID}/Messages.json`, (body) => {
        return (
          typeof body === 'string' &&
          body.includes('To=%2B972501234567') &&
          body.includes('From=%2B12025550100')
        );
      })
      .reply(201, { sid: 'SMxxx', status: 'queued' });

    const tw = new TwilioProvider({ accountSid: SID, authToken: 'tok', from: '+12025550100' });
    const res = await tw.send(message);
    expect(res.status).toBe('sent');
    expect(res.providerMessageId).toBe('SMxxx');
  });

  it('marks 400 invalid-phone as non-retryable', async () => {
    nock(BASE)
      .post(`/2010-04-01/Accounts/${SID}/Messages.json`)
      .reply(400, { code: 21211, message: 'Invalid To' });

    const tw = new TwilioProvider({ accountSid: SID, authToken: 'tok', from: '+12025550100' });
    const res = await tw.send(message);
    expect(res.status).toBe('failed');
    expect(res.error?.retryable).toBe(false);
  });

  it('uses MessagingServiceSid when fromIsMessagingService=true', async () => {
    let captured = '';
    nock(BASE)
      .post(`/2010-04-01/Accounts/${SID}/Messages.json`, (body) => {
        captured = body as string;
        return true;
      })
      .reply(201, { sid: 'SMxxx', status: 'queued' });

    const tw = new TwilioProvider({
      accountSid: SID,
      authToken: 'tok',
      from: 'MGabc',
      fromIsMessagingService: true,
    });
    await tw.send(message);

    expect(captured).toContain('MessagingServiceSid=MGabc');
    expect(captured).not.toContain('From=');
  });
});
