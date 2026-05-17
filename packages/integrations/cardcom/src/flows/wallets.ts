import { CardComClient } from '../client/CardComClient';
import { CreateLowProfileInput, CreateLowProfileResult } from '../types';

/**
 * Convenience helpers for wallet/alt-payment LowProfile flows.
 * All wallets reuse the LowProfile iframe (zero-PCI) and are gated by
 * advanced flags on the request.
 */

export async function bitLowProfile(
  client: CardComClient,
  input: Omit<CreateLowProfileInput, 'enableBit' | 'enableGooglePay' | 'enableApplePay'>
): Promise<CreateLowProfileResult> {
  return client.createLowProfile({
    ...input,
    enableBit: true,
    enableGooglePay: false,
    enableApplePay: false,
  });
}

export async function googlePayLowProfile(
  client: CardComClient,
  input: Omit<CreateLowProfileInput, 'enableBit' | 'enableGooglePay' | 'enableApplePay'>
): Promise<CreateLowProfileResult> {
  return client.createLowProfile({
    ...input,
    enableBit: false,
    enableGooglePay: true,
    enableApplePay: false,
  });
}

export async function applePayLowProfile(
  client: CardComClient,
  input: Omit<CreateLowProfileInput, 'enableBit' | 'enableGooglePay' | 'enableApplePay'>
): Promise<CreateLowProfileResult> {
  return client.createLowProfile({
    ...input,
    enableBit: false,
    enableGooglePay: false,
    enableApplePay: true,
  });
}

export async function multiWalletLowProfile(
  client: CardComClient,
  input: Omit<CreateLowProfileInput, 'enableBit' | 'enableGooglePay' | 'enableApplePay'>
): Promise<CreateLowProfileResult> {
  return client.createLowProfile({
    ...input,
    enableBit: true,
    enableGooglePay: true,
    enableApplePay: true,
  });
}
