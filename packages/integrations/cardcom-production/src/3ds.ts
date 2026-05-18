/**
 * 3DS 2.x — Payer Authentication (PA) flow.
 *
 * Cardcom integrates with MPI (Merchant Plug-In). The typical flow:
 *   1. Server calls /PA/Authorize → receives either:
 *      a) frictionless success (ECI/CAVV/XID returned, no challenge)
 *      b) ChallengeRequired=true + RedirectUrl (3DS ACS URL)
 *   2. Client (browser) is redirected to RedirectUrl, completes challenge,
 *      ACS posts back to our returnUrl with PARes/CRes payload.
 *   3. Server calls /PA/Complete with sessionId + PARes → final auth data.
 *   4. Server proceeds to capture/charge using the auth data + token.
 *
 * Codes 901/902/903 trigger a single automated retry per Cardcom guidance.
 */
import type { AxiosInstance } from 'axios';
import {
  ThreeDsRequestSchema,
  ThreeDsCompleteInputSchema,
  ThreeDsChallengeResponseSchema,
  type ThreeDsRequest,
  type ThreeDsChallengeResponse,
  type ThreeDsCompleteInput,
} from './types';
import { CardcomThreeDsError, fromAxiosError, isRetryable } from './errors';
import { buildAuthPayload } from './auth';
import type { CardcomCredentials } from './types';

export class ThreeDsService {
  constructor(
    private readonly http: AxiosInstance,
    private readonly creds: CardcomCredentials,
  ) {}

  /**
   * Initiate 3DS Payer Authorization. Retries once on transient code 901/902/903.
   */
  async authorize(input: ThreeDsRequest): Promise<ThreeDsChallengeResponse> {
    const parsed = ThreeDsRequestSchema.parse(input);
    const payload = {
      ...buildAuthPayload(this.creds),
      Amount: parsed.amount,
      CoinId: this.currencyToCoinId(parsed.currency),
      Token: parsed.token,
      NumOfPayments: parsed.numOfPayments ?? 1,
      ReturnUrl: parsed.returnUrl,
      ProductName: parsed.productName,
    };

    try {
      return await this.callAuthorize(payload);
    } catch (err) {
      const inner = err as { responseCode?: number; httpStatus?: number };
      if (isRetryable({ responseCode: inner.responseCode, httpStatus: inner.httpStatus })) {
        // single deterministic retry
        return await this.callAuthorize(payload);
      }
      throw err;
    }
  }

  private async callAuthorize(payload: Record<string, unknown>): Promise<ThreeDsChallengeResponse> {
    try {
      const { data } = await this.http.post('/Transactions/3DS/Authorize', payload);
      const parsed = ThreeDsChallengeResponseSchema.parse(data);
      if (parsed.ResponseCode !== 0 && !parsed.ChallengeRequired) {
        throw new CardcomThreeDsError(
          parsed.Description ?? `3DS authorize failed (code ${parsed.ResponseCode})`,
          { responseCode: parsed.ResponseCode },
        );
      }
      return parsed;
    } catch (err) {
      if (err instanceof CardcomThreeDsError) throw err;
      throw fromAxiosError(err);
    }
  }

  /**
   * Complete an MPI challenge after the ACS redirect returns.
   */
  async complete(input: ThreeDsCompleteInput): Promise<ThreeDsChallengeResponse> {
    const parsed = ThreeDsCompleteInputSchema.parse(input);
    if (!parsed.paRes && !parsed.cres) {
      throw new CardcomThreeDsError('Either paRes or cres must be supplied');
    }
    try {
      const { data } = await this.http.post('/Transactions/3DS/Complete', {
        ...buildAuthPayload(this.creds),
        ThreeDsSessionId: parsed.threeDsSessionId,
        PARes: parsed.paRes,
        CRes: parsed.cres,
      });
      const out = ThreeDsChallengeResponseSchema.parse(data);
      if (out.ResponseCode !== 0) {
        throw new CardcomThreeDsError(
          out.Description ?? `3DS complete failed (code ${out.ResponseCode})`,
          { responseCode: out.ResponseCode },
        );
      }
      return out;
    } catch (err) {
      if (err instanceof CardcomThreeDsError) throw err;
      throw fromAxiosError(err);
    }
  }

  private currencyToCoinId(currency: string): number {
    switch (currency) {
      case 'ILS':
        return 1;
      case 'USD':
        return 2;
      case 'EUR':
        return 978;
      case 'GBP':
        return 826;
      default:
        return 1;
    }
  }
}
