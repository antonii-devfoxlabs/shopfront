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

const WALLETS = ['apple_pay', 'google_pay', 'samsung_pay'];

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
 * Create the way to pay that the method's name stands for.
 * @returns {PaymentMethod}
 */
export function paymentMethod(method, details) {
  if (method === 'card') {
    return new Card(required(details, 'cardToken'));
  } else if (method === 'paypal') {
    return new PayPal(required(details, 'payerEmail'));
  } else if (WALLETS.includes(method)) {
    return new Wallet(method, required(details, 'walletToken'));
  } else if (method === 'bank_transfer') {
    return new BankTransfer(required(details, 'orderId'));
  } else if (method === 'gift_card') {
    return new GiftCard(required(details, 'code'));
  } else {
    throw new UnsupportedPaymentMethodError(method);
  }
}

// Charge the shopper and return the gateway's transaction id.
export function pay(method, amountCents, details) {
  return paymentMethod(method, details).charge(amountCents);
}

// Give the shopper's money back and return the gateway's refund id.
export function refund(method, amountCents, details) {
  return paymentMethod(method, details).refund(amountCents);
}

// A detail set to null is as missing as one left out, as in Python.
function required(details, name) {
  const value = details[name];
  if (value === undefined || value === null) {
    throw new MissingPaymentDetailError(name);
  }
  return value;
}
