// Taking the money, and giving it back, in whichever way the shopper chose.

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

// The ways to pay's slot for the payment gateway; its SDK fills it.
export interface Gateway {
  chargeCard(cardToken: string, amountCents: number): string;
  chargePaypal(payerEmail: string, amountCents: number): string;
  chargeWallet(
    wallet: string,
    walletToken: string,
    amountCents: number,
  ): string;
  expectTransfer(amountCents: number, reference: string): string;
  redeemGiftCard(code: string, amountCents: number): string;
  refundCard(cardToken: string, amountCents: number): string;
  refundPaypal(payerEmail: string, amountCents: number): string;
  refundWallet(
    wallet: string,
    walletToken: string,
    amountCents: number,
  ): string;
  sendTransfer(amountCents: number, reference: string): string;
  topUpGiftCard(code: string, amountCents: number): string;
}

export interface PaymentMethod {
  charge(amountCents: number): string;
  refund(amountCents: number): string;
}

export class Card implements PaymentMethod {
  readonly cardToken: string;
  readonly gateway: Gateway;

  constructor(cardToken: string, gateway: Gateway) {
    this.cardToken = cardToken;
    this.gateway = gateway;
  }

  charge(amountCents: number): string {
    return this.gateway.chargeCard(this.cardToken, amountCents);
  }

  refund(amountCents: number): string {
    return this.gateway.refundCard(this.cardToken, amountCents);
  }
}

export class PayPal implements PaymentMethod {
  readonly payerEmail: string;
  readonly gateway: Gateway;

  constructor(payerEmail: string, gateway: Gateway) {
    this.payerEmail = payerEmail;
    this.gateway = gateway;
  }

  charge(amountCents: number): string {
    return this.gateway.chargePaypal(this.payerEmail, amountCents);
  }

  refund(amountCents: number): string {
    return this.gateway.refundPaypal(this.payerEmail, amountCents);
  }
}

export class Wallet implements PaymentMethod {
  readonly wallet: string;
  readonly walletToken: string;
  readonly gateway: Gateway;

  constructor(wallet: string, walletToken: string, gateway: Gateway) {
    this.wallet = wallet;
    this.walletToken = walletToken;
    this.gateway = gateway;
  }

  charge(amountCents: number): string {
    return this.gateway.chargeWallet(
      this.wallet,
      this.walletToken,
      amountCents,
    );
  }

  refund(amountCents: number): string {
    return this.gateway.refundWallet(
      this.wallet,
      this.walletToken,
      amountCents,
    );
  }
}

export class BankTransfer implements PaymentMethod {
  readonly orderId: string;
  readonly gateway: Gateway;

  constructor(orderId: string, gateway: Gateway) {
    this.orderId = orderId;
    this.gateway = gateway;
  }

  charge(amountCents: number): string {
    const reference = `SHOPFRONT-${this.orderId}`;
    return this.gateway.expectTransfer(amountCents, reference);
  }

  refund(amountCents: number): string {
    const reference = `SHOPFRONT-${this.orderId}`;
    return this.gateway.sendTransfer(amountCents, reference);
  }
}

export class GiftCard implements PaymentMethod {
  readonly code: string;
  readonly gateway: Gateway;

  constructor(code: string, gateway: Gateway) {
    this.code = code;
    this.gateway = gateway;
  }

  charge(amountCents: number): string {
    return this.gateway.redeemGiftCard(this.code, amountCents);
  }

  refund(amountCents: number): string {
    return this.gateway.topUpGiftCard(this.code, amountCents);
  }
}

// Every way to pay, by the name the shopper picks, with the function
// that creates it from the shopper's details and the gateway it uses.
const PAYMENT_METHODS = new Map<
  string,
  (details: PaymentDetails, gateway: Gateway) => PaymentMethod
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
    'wero',
    (details, gateway) =>
      new Wallet(
        'wero',
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
  gateway: Gateway,
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
  gateway: Gateway,
): string {
  return payment(method, details, gateway).charge(amountCents);
}

// Give the shopper's money back and return the gateway's refund id.
export function refund(
  method: string,
  amountCents: number,
  details: PaymentDetails,
  gateway: Gateway,
): string {
  return payment(method, details, gateway).refund(amountCents);
}

function required(value: string | undefined, name: string): string {
  if (value === undefined) throw new MissingPaymentDetailError(name);
  return value;
}
