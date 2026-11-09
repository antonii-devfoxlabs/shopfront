// Taking the money, and giving it back, in whichever way the shopper chose.

import { settings } from './settings.ts';
import { PaymentGateway } from './vendor/paymentGateway.ts';

export class UnsupportedPaymentMethodError extends Error {
  override name = 'UnsupportedPaymentMethodError';
}

export class MissingPaymentDetailError extends Error {
  override name = 'MissingPaymentDetailError';
}

// Every way to pay needs something different, so every field is
// optional and each row of PAYMENT_METHODS checks the one it needs.
export type PaymentDetails = {
  cardToken?: string;
  payerEmail?: string;
  walletToken?: string;
  orderId?: string;
  code?: string;
};

export const gateway = new PaymentGateway({
  merchant: settings.merchantId,
});

export interface PaymentMethod {
  charge(amountCents: number): string;
  refund(amountCents: number): string;
}

export class Card implements PaymentMethod {
  readonly cardToken: string;

  constructor(cardToken: string) {
    this.cardToken = cardToken;
  }

  charge(amountCents: number): string {
    return gateway.chargeCard(this.cardToken, amountCents);
  }

  refund(amountCents: number): string {
    return gateway.refundCard(this.cardToken, amountCents);
  }
}

export class PayPal implements PaymentMethod {
  readonly payerEmail: string;

  constructor(payerEmail: string) {
    this.payerEmail = payerEmail;
  }

  charge(amountCents: number): string {
    return gateway.chargePaypal(this.payerEmail, amountCents);
  }

  refund(amountCents: number): string {
    return gateway.refundPaypal(this.payerEmail, amountCents);
  }
}

export class Wallet implements PaymentMethod {
  readonly wallet: string;
  readonly walletToken: string;

  constructor(wallet: string, walletToken: string) {
    this.wallet = wallet;
    this.walletToken = walletToken;
  }

  charge(amountCents: number): string {
    return gateway.chargeWallet(this.wallet, this.walletToken, amountCents);
  }

  refund(amountCents: number): string {
    return gateway.refundWallet(this.wallet, this.walletToken, amountCents);
  }
}

export class BankTransfer implements PaymentMethod {
  readonly orderId: string;

  constructor(orderId: string) {
    this.orderId = orderId;
  }

  charge(amountCents: number): string {
    const reference = `SHOPFRONT-${this.orderId}`;
    return gateway.expectTransfer(amountCents, reference);
  }

  refund(amountCents: number): string {
    const reference = `SHOPFRONT-${this.orderId}`;
    return gateway.sendTransfer(amountCents, reference);
  }
}

export class GiftCard implements PaymentMethod {
  readonly code: string;

  constructor(code: string) {
    this.code = code;
  }

  charge(amountCents: number): string {
    return gateway.redeemGiftCard(this.code, amountCents);
  }

  refund(amountCents: number): string {
    return gateway.topUpGiftCard(this.code, amountCents);
  }
}

// Every way to pay, by the name the shopper picks, with the function
// that creates it from the shopper's details.
const PAYMENT_METHODS = new Map<
  string,
  (details: PaymentDetails) => PaymentMethod
>([
  ['card', (details) => new Card(required(details.cardToken, 'cardToken'))],
  [
    'paypal',
    (details) => new PayPal(required(details.payerEmail, 'payerEmail')),
  ],
  [
    'apple_pay',
    (details) =>
      new Wallet('apple_pay', required(details.walletToken, 'walletToken')),
  ],
  [
    'google_pay',
    (details) =>
      new Wallet('google_pay', required(details.walletToken, 'walletToken')),
  ],
  [
    'samsung_pay',
    (details) =>
      new Wallet('samsung_pay', required(details.walletToken, 'walletToken')),
  ],
  [
    'bank_transfer',
    (details) => new BankTransfer(required(details.orderId, 'orderId')),
  ],
  ['gift_card', (details) => new GiftCard(required(details.code, 'code'))],
]);

// Create the way to pay that the method's name stands for.
export function payment(
  method: string,
  details: PaymentDetails,
): PaymentMethod {
  const create = PAYMENT_METHODS.get(method);
  if (create === undefined) {
    throw new UnsupportedPaymentMethodError(method);
  }
  return create(details);
}

// The names of the ways to pay, in the order checkout shows them.
export function accepted(): string[] {
  return [...PAYMENT_METHODS.keys()];
}

// Charge the shopper and return the gateway's transaction id.
export function pay(
  method: string,
  amountCents: number,
  details: PaymentDetails,
): string {
  return payment(method, details).charge(amountCents);
}

// Give the shopper's money back and return the gateway's refund id.
export function refund(
  method: string,
  amountCents: number,
  details: PaymentDetails,
): string {
  return payment(method, details).refund(amountCents);
}

function required(value: string | undefined, name: string): string {
  if (value === undefined) throw new MissingPaymentDetailError(name);
  return value;
}
