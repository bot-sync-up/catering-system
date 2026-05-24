import nock from 'nock';
import { MetaCloudProvider } from '../src/whatsapp/MetaCloudProvider';
import { Message } from '../src/types';

const BASE = 'https://graph.facebook.com/v19.0';
const PHONE_ID = '1234567890';

const baseMessage: Message = {
  channel: 'whatsapp',
  to: { address: '+972501234567', tenantId: 't1', userId: 'u1' },
  body: 'שלום',
};

describe('MetaCloudProvider', () => {
  afterEach(() => nock.cleanAll());

  it('sends free-form text and parses message id', async () => {
    nock(BASE)
      .post(`/${PHONE_ID}/messages`, (body) => {
        return (
          body.messaging_product === 'whatsapp' &&
          body.type === 'text' &&
          body.to === '972501234567' &&
          body.text.body === 'שלום'
        );
      })
      .reply(200, { messages: [{ id: 'wamid.abc' }], contacts: [{ wa_id: '972501234567' }] });

    const meta = new MetaCloudProvider({ accessToken: 'tok', phoneNumberId: PHONE_ID });
    const res = await meta.send(baseMessage);
    expect(res.status).toBe('sent');
    expect(res.providerMessageId).toBe('wamid.abc');
  });

  it('sends template message with positional params from declared template', async () => {
    let captured: Record<string, unknown> = {};
    nock(BASE)
      .post(`/${PHONE_ID}/messages`, (body) => {
        captured = body;
        return true;
      })
      .reply(200, { messages: [{ id: 'wamid.tmpl' }] });

    const meta = new MetaCloudProvider({ accessToken: 'tok', phoneNumberId: PHONE_ID });
    await meta.sendTemplate(
      baseMessage.to as { address: string; tenantId: string; userId: string },
      'order_confirmation',
      { firstName: 'משה', orderNumber: '1024', totalFormatted: '₪199', trackingUrl: 'https://x.co/o/1024' },
    );

    const tpl = captured as { template: { name: string; language: { code: string }; components: { parameters: { text: string }[] }[] } };
    expect(tpl.template.name).toBe('order_confirmation');
    expect(tpl.template.language.code).toBe('he');
    expect(tpl.template.components[0].parameters[0].text).toBe('משה');
    expect(tpl.template.components[0].parameters[3].text).toBe('https://x.co/o/1024');
  });

  it('marks 4xx (other than rate-limit codes) as non-retryable', async () => {
    nock(BASE)
      .post(`/${PHONE_ID}/messages`)
      .reply(400, { error: { code: 100, message: 'Invalid parameter' } });

    const meta = new MetaCloudProvider({ accessToken: 'tok', phoneNumberId: PHONE_ID });
    const res = await meta.send(baseMessage);
    expect(res.status).toBe('failed');
    expect(res.error?.retryable).toBe(false);
  });

  it('marks rate-limit code 131056 as retryable', async () => {
    nock(BASE)
      .post(`/${PHONE_ID}/messages`)
      .reply(400, { error: { code: 131_056, message: 'Pair rate limit hit' } });

    const meta = new MetaCloudProvider({ accessToken: 'tok', phoneNumberId: PHONE_ID });
    const res = await meta.send(baseMessage);
    expect(res.error?.retryable).toBe(true);
  });
});
