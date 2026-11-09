import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  BankTransfer,
  Card,
  GiftCard,
  MissingPaymentDetailError,
  PayPal,
  UnsupportedPaymentMethodError,
  Wallet,
  gateway,
  pay,
  paymentMethod,
  refund,
} from '../src/payments.js';
import {
  PaymentDeclinedError,
  PaymentGateway,
} from '../src/vendor/paymentGateway.js';

const EVERY_METHOD = [
  ['card', { cardToken: 'tok-4242' }, null],
  ['paypal', { payerEmail: 'ada@example.com' }, 'ada@example.com'],
  ['apple_pay', { walletToken: 'wallet-1' }, null],
  ['google_pay', { walletToken: 'wallet-2' }, null],
  ['samsung_pay', { walletToken: 'wallet-3' }, null],
  ['bank_transfer', { orderId: 'SF-00042' }, 'SHOPFRONT-SF-00042'],
  ['gift_card', { code: 'GIFT-2026-0001' }, 'GIFT-2026-0001'],
];

for (const [method, details, detail] of EVERY_METHOD) {
  test(`${method} charges the gateway`, () => {
    const transactionId = pay(method, 1_000, details);
    assert.deepEqual(gateway.charges.at(-1), {
      id: transactionId,
      kind: method,
      amount: 1_000,
      detail,
    });
  });
}

for (const [method, details, detail] of EVERY_METHOD) {
  test(`${method} refunds through the gateway`, () => {
    const refundId = refund(method, 1_000, details);
    assert.deepEqual(gateway.refunds.at(-1), {
      id: refundId,
      kind: method,
      amount: 1_000,
      detail,
    });
  });
}

const EACH_WAY = [
  [new Card('tok-4242'), 'card'],
  [new PayPal('ada@example.com'), 'paypal'],
  [new Wallet('samsung_pay', 'wallet-3'), 'samsung_pay'],
  [new BankTransfer('SF-00042'), 'bank_transfer'],
  [new GiftCard('GIFT-2026-0001'), 'gift_card'],
];

for (const [payment, kind] of EACH_WAY) {
  test(`${kind} charges on its own`, () => {
    const transactionId = payment.charge(1_000);
    assert.equal(gateway.charges.at(-1).id, transactionId);
    assert.equal(gateway.charges.at(-1).kind, kind);
  });
}

const EVERY_CLASS = [
  ['card', { cardToken: 'tok-4242' }, Card],
  ['paypal', { payerEmail: 'ada@example.com' }, PayPal],
  ['apple_pay', { walletToken: 'wallet-1' }, Wallet],
  ['google_pay', { walletToken: 'wallet-2' }, Wallet],
  ['samsung_pay', { walletToken: 'wallet-3' }, Wallet],
  ['bank_transfer', { orderId: 'SF-00042' }, BankTransfer],
  ['gift_card', { code: 'GIFT-2026-0001' }, GiftCard],
];

for (const [method, details, expected] of EVERY_CLASS) {
  test(`paymentMethod creates ${method} without charging`, () => {
    const chargesBefore = gateway.charges.length;
    assert.ok(paymentMethod(method, details) instanceof expected);
    assert.equal(gateway.charges.length, chargesBefore);
  });
}

test('a declined card throws', () => {
  assert.throws(
    () => pay('card', 1_000, { cardToken: 'declined' }),
    PaymentDeclinedError,
  );
});

for (const wallet of ['apple_pay', 'google_pay', 'samsung_pay']) {
  test(`a declined ${wallet} throws`, () => {
    assert.throws(() => pay(wallet, 1_000, { walletToken: 'declined' }), {
      constructor: PaymentDeclinedError,
      message: `${wallet} declined the payment`,
    });
  });
}

test('a missing detail is an error, not a charge', () => {
  const chargesBefore = gateway.charges.length;
  assert.throws(() => pay('card', 1_000, {}), {
    constructor: MissingPaymentDetailError,
    message: 'cardToken',
  });
  assert.equal(gateway.charges.length, chargesBefore);
});

test('a detail set to null is missing', () => {
  const chargesBefore = gateway.charges.length;
  assert.throws(() => pay('card', 1_000, { cardToken: null }), {
    constructor: MissingPaymentDetailError,
    message: 'cardToken',
  });
  assert.equal(gateway.charges.length, chargesBefore);
});

test('a gift card pays down to its balance', () => {
  const fresh = new PaymentGateway({ merchant: 'test' });
  fresh.redeemGiftCard('GIFT-2026-0001', 4_000);
  assert.equal(fresh.giftCards.get('GIFT-2026-0001'), 1_000);
  fresh.redeemGiftCard('GIFT-2026-0001', 1_000);
  assert.throws(() => fresh.redeemGiftCard('GIFT-2026-0001', 1), {
    constructor: PaymentDeclinedError,
    message: 'Not enough left on the gift card',
  });
});

test('an unknown gift card is declined', () => {
  const fresh = new PaymentGateway({ merchant: 'test' });
  assert.throws(() => fresh.redeemGiftCard('GIFT-0', 1), {
    constructor: PaymentDeclinedError,
    message: 'No gift card GIFT-0',
  });
});

test('an unknown method is an error', () => {
  assert.throws(() => pay('cash', 1_000, {}), UnsupportedPaymentMethodError);
});
