import nock from 'nock';

import { RestClient } from '../../src/client/rest-client';
import { ICountAuthError, ICountRateLimitError, ICountValidationError } from '../../src/types';

describe('RestClient', () => {
  const config = {
    apiKey: 'test_api_key',
    companyId: 'demo',
    baseUrl: 'https://api.test.icount.local/api/v3.php',
    maxRetries: 0,
  };

  beforeEach(() => {
    nock.cleanAll();
  });

  afterAll(() => {
    nock.restore();
  });

  it('throws when apiKey is missing', () => {
    expect(() => new RestClient({ apiKey: '', companyId: 'demo' })).toThrow(ICountValidationError);
  });

  it('throws when companyId is missing', () => {
    expect(() => new RestClient({ apiKey: 'k', companyId: '' })).toThrow(ICountValidationError);
  });

  it('injects cid + api_token into request body', async () => {
    const scope = nock(config.baseUrl)
      .post('/test', (body) => body.cid === 'demo' && body.api_token === 'test_api_key')
      .reply(200, { ok: true });

    const client = new RestClient(config);
    const result = await client.post('/test');
    expect(result).toEqual({ ok: true });
    scope.done();
  });

  it('maps 401 to ICountAuthError', async () => {
    nock(config.baseUrl).post('/auth').reply(401, { reason: 'Bad API key' });
    const client = new RestClient(config);
    await expect(client.post('/auth')).rejects.toBeInstanceOf(ICountAuthError);
  });

  it('maps 429 to ICountRateLimitError with retryAfter', async () => {
    nock(config.baseUrl)
      .post('/throttle')
      .reply(429, { reason: 'Too many' }, { 'retry-after': '30' });
    const client = new RestClient(config);
    try {
      await client.post('/throttle');
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ICountRateLimitError);
      expect((err as ICountRateLimitError).retryAfter).toBe(30);
    }
  });

  it('maps 422 to ICountValidationError', async () => {
    nock(config.baseUrl).post('/bad').reply(422, { error_description: 'Invalid' });
    const client = new RestClient(config);
    await expect(client.post('/bad')).rejects.toBeInstanceOf(ICountValidationError);
  });
});
