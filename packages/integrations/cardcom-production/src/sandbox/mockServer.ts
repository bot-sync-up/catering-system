/**
 * Local Cardcom mock server — for CI and offline development.
 * Returns realistic Cardcom v11 shapes so the rest of the SDK / app
 * can be exercised without touching real Cardcom.
 *
 * Start: `ts-node src/sandbox/mockServer.ts`
 *
 * Magic test-token cheat sheet (decline scenarios):
 *   token_decline   → ResponseCode 7  (declined)
 *   token_timeout   → ResponseCode 902 (transient, retry)
 *   token_3ds       → ChallengeRequired=true
 *   token_chargeback→ later POSTs a chargeback webhook
 *   (anything else)→ ResponseCode 0  (approved)
 */
import express, { type Application, type Request, type Response } from 'express';
import { randomUUID } from 'crypto';
import { computeSignature } from '../webhooks/handler';

export interface MockServerOptions {
  port?: number;
  signingSecret?: string;
}

interface StoredTransaction {
  tranzactionId: number;
  amount: number;
  currency: string;
  token?: string;
  refundedAmount: number;
}

export function createMockApp(opts: MockServerOptions = {}): Application {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  const transactions = new Map<number, StoredTransaction>();
  let nextTranId = 100_000;
  const lowProfiles = new Map<string, { amount: number; token?: string; operation: string }>();

  function tokenScenario(token?: string) {
    if (!token) return 'approve';
    if (token === 'token_decline') return 'decline';
    if (token === 'token_timeout') return 'transient';
    if (token === 'token_3ds') return 'threeds';
    if (token === 'token_chargeback') return 'chargeback';
    return 'approve';
  }

  // ---------------------------------------------------------------------------
  // LowProfile
  // ---------------------------------------------------------------------------

  app.post('/LowProfile/Create', (req: Request, res: Response) => {
    const id = `lp_${randomUUID()}`;
    lowProfiles.set(id, {
      amount: req.body.Amount,
      operation: req.body.Operation ?? 'ChargeOnly',
    });
    return res.json({
      ResponseCode: 0,
      Description: 'Success',
      LowProfileId: id,
      Url: `http://localhost:${opts.port ?? 4242}/iframe/${id}`,
    });
  });

  app.post('/LowProfile/GetLpResult', (req: Request, res: Response) => {
    const lp = lowProfiles.get(req.body.LowProfileId);
    if (!lp) {
      return res.json({ ResponseCode: 901, Description: 'Unknown LowProfileId', LowProfileId: req.body.LowProfileId });
    }
    const tranId = ++nextTranId;
    const token = `tok_${randomUUID().replace(/-/g, '')}`;
    transactions.set(tranId, { tranzactionId: tranId, amount: lp.amount, currency: 'ILS', token, refundedAmount: 0 });
    return res.json({
      ResponseCode: 0,
      LowProfileId: req.body.LowProfileId,
      TranzactionId: tranId,
      Operation: lp.operation,
      TranzactionInfo: {
        ResponseCode: 0,
        Amount: lp.amount,
        CoinId: 1,
        ApprovalNumber: String(Math.floor(Math.random() * 1_000_000)),
        Last4CardDigits: '4242',
        CardMonth: 12,
        CardYear: 2030,
        Token: token,
      },
    });
  });

  // ---------------------------------------------------------------------------
  // Charge
  // ---------------------------------------------------------------------------

  app.post('/Transactions/Transaction', (req: Request, res: Response) => {
    const scenario = tokenScenario(req.body.Token);
    if (scenario === 'decline') {
      return res.json({
        ResponseCode: 7,
        Description: 'Declined by issuer',
        TranzactionId: 0,
        Amount: req.body.Amount,
      });
    }
    if (scenario === 'transient') {
      return res.status(503).json({ ResponseCode: 902, Description: 'Transient' });
    }
    const tranId = ++nextTranId;
    transactions.set(tranId, {
      tranzactionId: tranId,
      amount: req.body.Amount,
      currency: 'ILS',
      token: req.body.Token,
      refundedAmount: 0,
    });
    return res.json({
      ResponseCode: 0,
      Description: 'Approved',
      TranzactionId: tranId,
      ApprovalNumber: String(Math.floor(Math.random() * 1_000_000)),
      Amount: req.body.Amount,
      CoinId: req.body.CoinId,
      Last4CardDigits: '4242',
      Token: req.body.Token,
    });
  });

  // ---------------------------------------------------------------------------
  // Refund
  // ---------------------------------------------------------------------------

  app.post('/Transactions/RefundByTransactionId', (req: Request, res: Response) => {
    const tx = transactions.get(req.body.TransactionId);
    if (!tx) {
      return res.json({ ResponseCode: 5, Description: 'Transaction not found', TranzactionId: req.body.TransactionId, RefundedAmount: 0 });
    }
    const refundAmt = req.body.PartialSum ?? tx.amount - tx.refundedAmount;
    if (refundAmt + tx.refundedAmount > tx.amount) {
      return res.json({ ResponseCode: 6, Description: 'Refund exceeds remaining', TranzactionId: tx.tranzactionId, RefundedAmount: 0 });
    }
    tx.refundedAmount += refundAmt;
    return res.json({
      ResponseCode: 0,
      Description: 'Refunded',
      TranzactionId: tx.tranzactionId,
      RefundedAmount: refundAmt,
    });
  });

  // ---------------------------------------------------------------------------
  // Tokenize
  // ---------------------------------------------------------------------------

  app.post('/Tokens/CreateTokenFromToken', (req: Request, res: Response) => {
    return res.json({
      ResponseCode: 0,
      Description: 'Token rotated',
      Token: `tok_${randomUUID().replace(/-/g, '')}`,
      Last4CardDigits: '4242',
      CardMonth: req.body.CardExpirationMonth ?? 12,
      CardYear: req.body.CardExpirationYear ?? 2030,
    });
  });

  // ---------------------------------------------------------------------------
  // Recurring
  // ---------------------------------------------------------------------------

  app.post('/Recurring/Create', (req: Request, res: Response) => {
    return res.json({
      ResponseCode: 0,
      Description: 'Recurring created',
      RecurringId: `rec_${randomUUID()}`,
    });
  });
  app.post('/Recurring/Cancel', (req: Request, res: Response) => {
    return res.json({ ResponseCode: 0, Description: 'Recurring cancelled' });
  });

  // ---------------------------------------------------------------------------
  // 3DS PA
  // ---------------------------------------------------------------------------

  app.post('/Transactions/3DS/Authorize', (req: Request, res: Response) => {
    const scenario = tokenScenario(req.body.Token);
    if (scenario === 'transient') {
      return res.json({ ResponseCode: 902, Description: 'Transient, retry', ChallengeRequired: false });
    }
    if (scenario === 'threeds') {
      const sid = `3ds_${randomUUID()}`;
      return res.json({
        ResponseCode: 0,
        ChallengeRequired: true,
        RedirectUrl: `http://localhost:${opts.port ?? 4242}/3ds/challenge/${sid}`,
        ThreeDsSessionId: sid,
      });
    }
    return res.json({
      ResponseCode: 0,
      ChallengeRequired: false,
      ThreeDsSessionId: `3ds_${randomUUID()}`,
      AuthorizationData: {
        eci: '05',
        cavv: 'mock-cavv',
        xid: 'mock-xid',
        dsTransId: 'mock-ds-trans',
      },
    });
  });

  app.post('/Transactions/3DS/Complete', (req: Request, res: Response) => {
    return res.json({
      ResponseCode: 0,
      ChallengeRequired: false,
      ThreeDsSessionId: req.body.ThreeDsSessionId,
      AuthorizationData: {
        eci: '05',
        cavv: 'mock-cavv-complete',
        xid: 'mock-xid-complete',
      },
    });
  });

  // ---------------------------------------------------------------------------
  // Test helper: emit a signed webhook to a target URL
  // ---------------------------------------------------------------------------

  app.post('/__emit_webhook', async (req: Request, res: Response) => {
    const { targetUrl, eventType, payload } = req.body;
    const secret = opts.signingSecret ?? 'mock-signing-secret-min-16-chars';
    const body = JSON.stringify(payload);
    const timestamp = String(Math.floor(Date.now() / 1000));
    const nonce = randomUUID();
    const signature = computeSignature(body, timestamp, nonce, secret);

    try {
      const r = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Cardcom-Signature': signature,
          'X-Cardcom-Timestamp': timestamp,
          'X-Cardcom-Nonce': nonce,
          'X-Cardcom-Event': eventType,
        },
        body,
      });
      return res.json({ ok: true, status: r.status });
    } catch (e) {
      return res.status(500).json({ ok: false, error: String(e) });
    }
  });

  app.get('/healthz', (_req, res) => res.json({ ok: true, service: 'cardcom-mock' }));

  return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT ?? 4242);
  const app = createMockApp({ port, signingSecret: process.env.MOCK_SIGNING_SECRET });
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`[cardcom-mock] listening on http://localhost:${port}`);
  });
}
