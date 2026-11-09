// Taking the money, and giving it back, in whichever way the shopper chose.

import type { PaymentGateway } from './vendor/paymentGateway.ts';

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

export interface PaymentMethod {
  charge(amountCents: number): string;
  refund(amountCents: number): string;
}

export class Card implements PaymentMethod {
  readonly cardToken: string;
  readonly gateway: PaymentGateway;

  constructor(cardToken: string, gateway: PaymentGateway) {
    this.cardToken = cardToken;
    this.gateway = gateway;
  }

  charge(amountCents: number): string {
    const started = performance.now();
    const transactionId = this.gateway.chargeCard(
      this.cardToken,
      amountCents,
    );
    const tookMs = performance.now() - started;
    console.log(`gateway chargeCard in ${tookMs.toFixed(0)} ms`);
    return transactionId;
  }

  refund(amountCents: number): string {
    const started = performance.now();
    const refundId = this.gateway.refundCard(this.cardToken, amountCents);
    const tookMs = performance.now() - started;
    console.log(`gateway refundCard in ${tookMs.toFixed(0)} ms`);
    return refundId;
  }
}

export class PayPal implements PaymentMethod {
  readonly payerEmail: string;
  readonly gateway: PaymentGateway;

  constructor(payerEmail: string, gateway: PaymentGateway) {
    this.payerEmail = payerEmail;
    this.gateway = gateway;
  }

  charge(amountCents: number): string {
    const started = performance.now();
    const transactionId = this.gateway.chargePaypal(
      this.payerEmail,
      amountCents,
    );
    const tookMs = performance.now() - started;
    console.log(`gateway chargePaypal in ${tookMs.toFixed(0)} ms`);
    return transactionId;
  }

  refund(amountCents: number): string {
    const started = performance.now();
    const refundId = this.gateway.refundPaypal(this.payerEmail, amountCents);
    const tookMs = performance.now() - started;
    console.log(`gateway refundPaypal in ${tookMs.toFixed(0)} ms`);
    return refundId;
  }
}

export class Wallet implements PaymentMethod {
  readonly wallet: string;
  readonly walletToken: string;
  readonly gateway: PaymentGateway;

  constructor(wallet: string, walletToken: string, gateway: PaymentGateway) {
    this.wallet = wallet;
    this.walletToken = walletToken;
    this.gateway = gateway;
  }

  charge(amountCents: number): string {
    const started = performance.now();
    const transactionId = this.gateway.chargeWallet(
      this.wallet,
      this.walletToken,
      amountCents,
    );
    const tookMs = performance.now() - started;
    console.log(`gateway chargeWallet in ${tookMs.toFixed(0)} ms`);
    return transactionId;
  }

  refund(amountCents: number): string {
    const started = performance.now();
    const refundId = this.gateway.refundWallet(
      this.wallet,
      this.walletToken,
      amountCents,
    );
    const tookMs = performance.now() - started;
    console.log(`gateway refundWallet in ${tookMs.toFixed(0)} ms`);
    return refundId;
  }
}

export class BankTransfer implements PaymentMethod {
  readonly orderId: string;
  readonly gateway: PaymentGateway;

  constructor(orderId: string, gateway: PaymentGateway) {
    this.orderId = orderId;
    this.gateway = gateway;
  }

  charge(amountCents: number): string {
    const reference = `SHOPFRONT-${this.orderId}`;
    const started = performance.now();
    const transactionId = this.gateway.expectTransfer(amountCents, reference);
    const tookMs = performance.now() - started;
    console.log(`gateway expectTransfer in ${tookMs.toFixed(0)} ms`);
    return transactionId;
  }

  refund(amountCents: number): string {
    const reference = `SHOPFRONT-${this.orderId}`;
    const started = performance.now();
    const refundId = this.gateway.sendTransfer(amountCents, reference);
    const tookMs = performance.now() - started;
    console.log(`gateway sendTransfer in ${tookMs.toFixed(0)} ms`);
    return refundId;
  }
}

export class GiftCard implements PaymentMethod {
  readonly code: string;
  readonly gateway: PaymentGateway;

  constructor(code: string, gateway: PaymentGateway) {
    this.code = code;
    this.gateway = gateway;
  }

  charge(amountCents: number): string {
    const started = performance.now();
    const transactionId = this.gateway.redeemGiftCard(this.code, amountCents);
    const tookMs = performance.now() - started;
    console.log(`gateway redeemGiftCard in ${tookMs.toFixed(0)} ms`);
    return transactionId;
  }

  refund(amountCents: number): string {
    const started = performance.now();
    const refundId = this.gateway.topUpGiftCard(this.code, amountCents);
    const tookMs = performance.now() - started;
    console.log(`gateway topUpGiftCard in ${tookMs.toFixed(0)} ms`);
    return refundId;
  }
}

// Every way to pay, by the name the shopper picks, with the function
// that creates it from the shopper's details and the gateway it uses.
const PAYMENT_METHODS = new Map<
  string,
  (details: PaymentDetails, gateway: PaymentGateway) => PaymentMethod
>([
  [
    'card',
    (details, gateway) =>
      new Card(required(details.cardToken, 'cardToken'), gateway),
  ],
  [
    'paypal',
    (details, gateway) =>
      new PayPal(required(details.payerEmail, 'payerEmail'), gateway),
  ],
  [
    'apple_pay',
    (details, gateway) =>
      new Wallet(
        'apple_pay',
        required(details.walletToken, 'walletToken'),
        gateway,
      ),
  ],
  [
    'google_pay',
    (details, gateway) =>
      new Wallet(
        'google_pay',
        required(details.walletToken, 'walletToken'),
        gateway,
      ),
  ],
  [
    'samsung_pay',
    (details, gateway) =>
      new Wallet(
        'samsung_pay',
        required(details.walletToken, 'walletToken'),
        gateway,
      ),
  ],
  [
    'bank_transfer',
    (details, gateway) =>
      new BankTransfer(required(details.orderId, 'orderId'), gateway),
  ],
  [
    'gift_card',
    (details, gateway) =>
      new GiftCard(required(details.code, 'code'), gateway),
  ],
]);

// Create the way to pay that the method's name stands for.
export function payment(
  method: string,
  details: PaymentDetails,
  gateway: PaymentGateway,
): PaymentMethod {
  const create = PAYMENT_METHODS.get(method);
  if (create === undefined) {
    throw new UnsupportedPaymentMethodError(method);
  }
  return create(details, gateway);
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
  gateway: PaymentGateway,
): string {
  return payment(method, details, gateway).charge(amountCents);
}

// Give the shopper's money back and return the gateway's refund id.
export function refund(
  method: string,
  amountCents: number,
  details: PaymentDetails,
  gateway: PaymentGateway,
): string {
  return payment(method, details, gateway).refund(amountCents);
}

function required(value: string | undefined, name: string): string {
  if (value === undefined) throw new MissingPaymentDetailError(name);
  return value;
}
