// Taking the money, and giving it back, in whichever way the shopper chose.

import { settings } from './settings.js';
import { PaymentGateway } from './vendor/paymentGateway.js';

export class UnsupportedPaymentMethodError extends Error {
  name = 'UnsupportedPaymentMethodError';
}

export class MissingPaymentDetailError extends Error {
  name = 'MissingPaymentDetailError';
}

export const gateway = new PaymentGateway({
  merchant: settings.merchantId,
});

/**
 * Every way to pay fills this slot.
 * @typedef {object} PaymentMethod
 * @property {(amountCents: number) => string} charge
 * @property {(amountCents: number) => string} refund
 */

export class Card {
  constructor(cardToken) {
    this.cardToken = cardToken;
  }

  charge(amountCents) {
    return gateway.chargeCard(this.cardToken, amountCents);
  }

  refund(amountCents) {
    return gateway.refundCard(this.cardToken, amountCents);
  }
}

export class PayPal {
  constructor(payerEmail) {
    this.payerEmail = payerEmail;
  }

  charge(amountCents) {
    return gateway.chargePaypal(this.payerEmail, amountCents);
  }

  refund(amountCents) {
    return gateway.refundPaypal(this.payerEmail, amountCents);
  }
}

export class Wallet {
  constructor(wallet, walletToken) {
    this.wallet = wallet;
    this.walletToken = walletToken;
  }

  charge(amountCents) {
    return gateway.chargeWallet(this.wallet, this.walletToken, amountCents);
  }

  refund(amountCents) {
    return gateway.refundWallet(this.wallet, this.walletToken, amountCents);
  }
}

export class BankTransfer {
  constructor(orderId) {
    this.orderId = orderId;
  }

  charge(amountCents) {
    const reference = `SHOPFRONT-${this.orderId}`;
    return gateway.expectTransfer(amountCents, reference);
  }

  refund(amountCents) {
    const reference = `SHOPFRONT-${this.orderId}`;
    return gateway.sendTransfer(amountCents, reference);
  }
}

export class GiftCard {
  constructor(code) {
    this.code = code;
  }

  charge(amountCents) {
    return gateway.redeemGiftCard(this.code, amountCents);
  }

  refund(amountCents) {
    return gateway.topUpGiftCard(this.code, amountCents);
  }
}

/**
 * Every way to pay, by the name the shopper picks, with the function
 * that creates it from the shopper's details.
 * @type {Map<string, (details: object) => PaymentMethod>}
 */
export const PAYMENT_METHODS = new Map([
  ['card', (details) => new Card(required(details, 'cardToken'))],
  ['paypal', (details) => new PayPal(required(details, 'payerEmail'))],
  [
    'apple_pay',
    (details) => new Wallet('apple_pay', required(details, 'walletToken')),
  ],
  [
    'google_pay',
    (details) => new Wallet('google_pay', required(details, 'walletToken')),
  ],
  [
    'samsung_pay',
    (details) => new Wallet('samsung_pay', required(details, 'walletToken')),
  ],
  [
    'bank_transfer',
    (details) => new BankTransfer(required(details, 'orderId')),
  ],
  ['gift_card', (details) => new GiftCard(required(details, 'code'))],
]);

/**
 * Create the way to pay that the method's name stands for.
 * @returns {PaymentMethod}
 */
export function payment(method, details) {
  const create = PAYMENT_METHODS.get(method);
  if (create === undefined) {
    throw new UnsupportedPaymentMethodError(method);
  }
  return create(details);
}

// The names of the ways to pay, in the order checkout shows them.
export function accepted() {
  return [...PAYMENT_METHODS.keys()];
}

// Charge the shopper and return the gateway's transaction id.
export function pay(method, amountCents, details) {
  return payment(method, details).charge(amountCents);
}

// Give the shopper's money back and return the gateway's refund id.
export function refund(method, amountCents, details) {
  return payment(method, details).refund(amountCents);
}

// A detail set to null is as missing as one left out, as in Python.
function required(details, name) {
  const value = details[name];
  if (value === undefined || value === null) {
    throw new MissingPaymentDetailError(name);
  }
  return value;
}
