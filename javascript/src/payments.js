// Taking the money, and giving it back, in whichever way the shopper chose.

/** @import { PaymentGateway } from './vendor/paymentGateway.js' */

export class UnsupportedPaymentMethodError extends Error {
  name = 'UnsupportedPaymentMethodError';
}

export class MissingPaymentDetailError extends Error {
  name = 'MissingPaymentDetailError';
}

/**
 * Every way to pay fills this slot.
 * @typedef {object} PaymentMethod
 * @property {(amountCents: number) => string} charge
 * @property {(amountCents: number) => string} refund
 */

export class Card {
  constructor(cardToken, gateway) {
    this.cardToken = cardToken;
    this.gateway = gateway;
  }

  charge(amountCents) {
    const started = performance.now();
    const transactionId = this.gateway.chargeCard(
      this.cardToken,
      amountCents,
    );
    const tookMs = performance.now() - started;
    console.log(`gateway chargeCard in ${tookMs.toFixed(0)} ms`);
    return transactionId;
  }

  refund(amountCents) {
    const started = performance.now();
    const refundId = this.gateway.refundCard(this.cardToken, amountCents);
    const tookMs = performance.now() - started;
    console.log(`gateway refundCard in ${tookMs.toFixed(0)} ms`);
    return refundId;
  }
}

export class PayPal {
  constructor(payerEmail, gateway) {
    this.payerEmail = payerEmail;
    this.gateway = gateway;
  }

  charge(amountCents) {
    const started = performance.now();
    const transactionId = this.gateway.chargePaypal(
      this.payerEmail,
      amountCents,
    );
    const tookMs = performance.now() - started;
    console.log(`gateway chargePaypal in ${tookMs.toFixed(0)} ms`);
    return transactionId;
  }

  refund(amountCents) {
    const started = performance.now();
    const refundId = this.gateway.refundPaypal(this.payerEmail, amountCents);
    const tookMs = performance.now() - started;
    console.log(`gateway refundPaypal in ${tookMs.toFixed(0)} ms`);
    return refundId;
  }
}

export class Wallet {
  constructor(wallet, walletToken, gateway) {
    this.wallet = wallet;
    this.walletToken = walletToken;
    this.gateway = gateway;
  }

  charge(amountCents) {
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

  refund(amountCents) {
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

export class BankTransfer {
  constructor(orderId, gateway) {
    this.orderId = orderId;
    this.gateway = gateway;
  }

  charge(amountCents) {
    const reference = `SHOPFRONT-${this.orderId}`;
    const started = performance.now();
    const transactionId = this.gateway.expectTransfer(amountCents, reference);
    const tookMs = performance.now() - started;
    console.log(`gateway expectTransfer in ${tookMs.toFixed(0)} ms`);
    return transactionId;
  }

  refund(amountCents) {
    const reference = `SHOPFRONT-${this.orderId}`;
    const started = performance.now();
    const refundId = this.gateway.sendTransfer(amountCents, reference);
    const tookMs = performance.now() - started;
    console.log(`gateway sendTransfer in ${tookMs.toFixed(0)} ms`);
    return refundId;
  }
}

export class GiftCard {
  constructor(code, gateway) {
    this.code = code;
    this.gateway = gateway;
  }

  charge(amountCents) {
    const started = performance.now();
    const transactionId = this.gateway.redeemGiftCard(this.code, amountCents);
    const tookMs = performance.now() - started;
    console.log(`gateway redeemGiftCard in ${tookMs.toFixed(0)} ms`);
    return transactionId;
  }

  refund(amountCents) {
    const started = performance.now();
    const refundId = this.gateway.topUpGiftCard(this.code, amountCents);
    const tookMs = performance.now() - started;
    console.log(`gateway topUpGiftCard in ${tookMs.toFixed(0)} ms`);
    return refundId;
  }
}

/**
 * Creates one way to pay from the shopper's details and the gateway
 * it uses.
 * @callback CreatePayment
 * @param {object} details
 * @param {PaymentGateway} gateway
 * @returns {PaymentMethod}
 */

/**
 * Every way to pay, by the name the shopper picks, with the function
 * that creates it.
 * @type {Map<string, CreatePayment>}
 */
const PAYMENT_METHODS = new Map([
  [
    'card',
    (details, gateway) => new Card(required(details, 'cardToken'), gateway),
  ],
  [
    'paypal',
    (details, gateway) =>
      new PayPal(required(details, 'payerEmail'), gateway),
  ],
  [
    'apple_pay',
    (details, gateway) =>
      new Wallet('apple_pay', required(details, 'walletToken'), gateway),
  ],
  [
    'google_pay',
    (details, gateway) =>
      new Wallet('google_pay', required(details, 'walletToken'), gateway),
  ],
  [
    'samsung_pay',
    (details, gateway) =>
      new Wallet('samsung_pay', required(details, 'walletToken'), gateway),
  ],
  [
    'bank_transfer',
    (details, gateway) =>
      new BankTransfer(required(details, 'orderId'), gateway),
  ],
  [
    'gift_card',
    (details, gateway) => new GiftCard(required(details, 'code'), gateway),
  ],
]);

/**
 * Create the way to pay that the method's name stands for.
 * @returns {PaymentMethod}
 */
export function payment(method, details, gateway) {
  const create = PAYMENT_METHODS.get(method);
  if (create === undefined) {
    throw new UnsupportedPaymentMethodError(method);
  }
  return create(details, gateway);
}

// The names of the ways to pay, in the order checkout shows them.
export function accepted() {
  return [...PAYMENT_METHODS.keys()];
}

// Charge the shopper and return the gateway's transaction id.
export function pay(method, amountCents, details, gateway) {
  return payment(method, details, gateway).charge(amountCents);
}

// Give the shopper's money back and return the gateway's refund id.
export function refund(method, amountCents, details, gateway) {
  return payment(method, details, gateway).refund(amountCents);
}

// A detail set to null is as missing as one left out, as in Python.
function required(details, name) {
  const value = details[name];
  if (value === undefined || value === null) {
    throw new MissingPaymentDetailError(name);
  }
  return value;
}
