// Taking the money, in whichever way the shopper chose.

import { settings } from './settings.ts';
import { PaymentGateway } from './vendor/paymentGateway.ts';

export class UnsupportedPaymentMethodError extends Error {
  override name = 'UnsupportedPaymentMethodError';
}

export class MissingPaymentDetailError extends Error {
  override name = 'MissingPaymentDetailError';
}

// Every way to pay needs something different, so every field is
// optional and each branch checks the one it needs.
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

const WALLETS = ['apple_pay', 'google_pay', 'samsung_pay'];

export interface PaymentMethod {
  charge(amountCents: number): string;
}

export class Card implements PaymentMethod {
  readonly cardToken: string;

  constructor(cardToken: string) {
    this.cardToken = cardToken;
  }

  charge(amountCents: number): string {
    return gateway.chargeCard(this.cardToken, amountCents);
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
}

export class GiftCard implements PaymentMethod {
  readonly code: string;

  constructor(code: string) {
    this.code = code;
  }

  charge(amountCents: number): string {
    return gateway.redeemGiftCard(this.code, amountCents);
  }
}

// Charge the shopper and return the gateway's transaction id.
export function pay(
  method: string,
  amountCents: number,
  details: PaymentDetails,
): string {
  let payment: PaymentMethod;
  if (method === 'card') {
    payment = new Card(required(details.cardToken, 'cardToken'));
  } else if (method === 'paypal') {
    payment = new PayPal(required(details.payerEmail, 'payerEmail'));
  } else if (WALLETS.includes(method)) {
    const walletToken = required(details.walletToken, 'walletToken');
    payment = new Wallet(method, walletToken);
  } else if (method === 'bank_transfer') {
    payment = new BankTransfer(required(details.orderId, 'orderId'));
  } else if (method === 'gift_card') {
    payment = new GiftCard(required(details.code, 'code'));
  } else {
    throw new UnsupportedPaymentMethodError(method);
  }
  return payment.charge(amountCents);
}

function required(value: string | undefined, name: string): string {
  if (value === undefined) throw new MissingPaymentDetailError(name);
  return value;
}
