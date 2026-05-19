import nock from 'nock';
import { SendGridProvider } from '../src/email/SendGridProvider';
import { Message } from '../src/types';

const BASE = 'https://api.sendgrid.com';

const message: Message = {
  channel: 'email',
  to: { address: 'test@example.com', tenantId: 't1', userId: 'u1', name: 'Test User' },
  subject: 'שלום',
  body: 'שלום עולם',
  html: '<p>שלום עולם</p>',
};

describe('SendGridProvider', () => {
  afterEach(() => nock.cleanAll());

  it('sends a basic email and returns provider message id', async () => {
    nock(BASE)
      .post('/v3/mail/send', (body) => {
        // sanity-check the payload — RTL Hebrew should pass through unchanged
        return (
          body.from.email === 'no-reply@syncup.co.il' &&
          body.personalizations[0].to[0].email === 'test@example.com' &&
          body.personalizations[0].subject === 'שלום' &&
          Array.isArray(body.content)
        );
      })
      .reply(202, '', { 'x-message-id': 'sg-abc-123' });

    const sg = new SendGridProvider({ apiKey: 'SG.fake', fromEmail: 'no-reply@syncup.co.il' });
    const result = await sg.send(message);

    expect(result.status).toBe('sent');
    expect(result.providerMessageId).toBe('sg-abc-123');
    expect(result.provider).toBe('sendgrid');
  });

  it('marks 401 as non-retryable', async () => {
    nock(BASE)
      .post('/v3/mail/send')
      .reply(401, { errors: [{ message: 'Unauthorized' }] });

    const sg = new SendGridProvider({ apiKey: 'SG.fake', fromEmail: 'a@b.com' });
    const result = await sg.send(message);

    expect(result.status).toBe('failed');
    expect(result.error?.retryable).toBe(false);
  });

  it('marks 5xx and 429 as retryable', async () => {
    nock(BASE).post('/v3/mail/send').reply(503, 'unavailable');
    const sg = new SendGridProvider({ apiKey: 'SG.fake', fromEmail: 'a@b.com' });
    const r1 = await sg.send(message);
    expect(r1.error?.retryable).toBe(true);

    nock(BASE).post('/v3/mail/send').reply(429, 'rate');
    const r2 = await sg.send(message);
    expect(r2.error?.retryable).toBe(true);
  });

  it('uses template id with dynamic data when template ref is set', async () => {
    let captured: Record<string, unknown> = {};
    nock(BASE)
      .post('/v3/mail/send', (body) => {
        captured = body;
        return true;
      })
      .reply(202, '', { 'x-message-id': 'sg-x' });

    const sg = new SendGridProvider({
      apiKey: 'SG.fake',
      fromEmail: 'no-reply@syncup.co.il',
      templateMap: { welcome: 'd-real-sendgrid-id' },
    });
    await sg.send({
      ...message,
      body: undefined,
      html: undefined,
      template: { id: 'welcome', data: { firstName: 'משה' } },
    });

    expect(captured.template_id).toBe('d-real-sendgrid-id');
    expect((captured as { personalizations: { dynamic_template_data: { firstName: string } }[] }).personalizations[0].dynamic_template_data.firstName).toBe('משה');
  });
});
