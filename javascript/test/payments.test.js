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
  accepted,
  pay,
  payment,
  refund,
} from '../src/payments.js';
import { DUTCH_SHOP, GERMAN_SHOP } from '../src/settings.js';
import {
  PaymentDeclinedError,
  PaymentGateway,
} from '../src/vendor/paymentGateway.js';

// A new payment gateway of the German shop, for one test.
function aGateway() {
  return new PaymentGateway({ merchant: GERMAN_SHOP.merchantId });
}

const EVERY_METHOD = [
  ['card', { cardToken: 'tok-4242' }, null],
  ['paypal', { payerEmail: 'ada@example.com' }, 'ada@example.com'],
  ['apple_pay', { walletToken: 'wallet-1' }, null],
  ['google_pay', { walletToken: 'wallet-2' }, null],
  ['samsung_pay', { walletToken: 'wallet-3' }, null],
  ['wero', { walletToken: 'wallet-4' }, null],
  ['bank_transfer', { orderId: 'SF-00042' }, 'SHOPFRONT-SF-00042'],
  ['gift_card', { code: 'GIFT-2026-0001' }, 'GIFT-2026-0001'],
];

for (const [method, details, detail] of EVERY_METHOD) {
  test(`${method} charges the gateway`, () => {
    const gateway = aGateway();
    const transactionId = pay(method, 1_000, details, gateway);
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
    const gateway = aGateway();
    const refundId = refund(method, 1_000, details, gateway);
    assert.deepEqual(gateway.refunds.at(-1), {
      id: refundId,
      kind: method,
      amount: 1_000,
      detail,
    });
  });
}

const EACH_WAY = [
  [(gateway) => new Card('tok-4242', gateway), 'card'],
  [(gateway) => new PayPal('ada@example.com', gateway), 'paypal'],
  [
    (gateway) => new Wallet('samsung_pay', 'wallet-3', gateway),
    'samsung_pay',
  ],
  [(gateway) => new BankTransfer('SF-00042', gateway), 'bank_transfer'],
  [(gateway) => new GiftCard('GIFT-2026-0001', gateway), 'gift_card'],
];

for (const [create, kind] of EACH_WAY) {
  test(`${kind} charges on its own`, () => {
    const gateway = aGateway();
    const transactionId = create(gateway).charge(1_000);
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
  ['wero', { walletToken: 'wallet-4' }, Wallet],
  ['bank_transfer', { orderId: 'SF-00042' }, BankTransfer],
  ['gift_card', { code: 'GIFT-2026-0001' }, GiftCard],
];

for (const [method, details, expected] of EVERY_CLASS) {
  test(`payment creates ${method} without charging`, () => {
    const gateway = aGateway();
    const chargesBefore = gateway.charges.length;
    assert.ok(payment(method, details, gateway) instanceof expected);
    assert.equal(gateway.charges.length, chargesBefore);
  });
}

test('a declined card throws', () => {
  const gateway = aGateway();
  assert.throws(
    () => pay('card', 1_000, { cardToken: 'declined' }, gateway),
    PaymentDeclinedError,
  );
});

for (const wallet of ['apple_pay', 'google_pay', 'samsung_pay']) {
  test(`a declined ${wallet} throws`, () => {
    const gateway = aGateway();
    assert.throws(
      () => pay(wallet, 1_000, { walletToken: 'declined' }, gateway),
      {
        constructor: PaymentDeclinedError,
        message: `${wallet} declined the payment`,
      },
    );
  });
}

test('a missing detail is an error, not a charge', () => {
  const gateway = aGateway();
  const chargesBefore = gateway.charges.length;
  assert.throws(() => pay('card', 1_000, {}, gateway), {
    constructor: MissingPaymentDetailError,
    message: 'cardToken',
  });
  assert.equal(gateway.charges.length, chargesBefore);
});

test('a detail set to null is missing', () => {
  const gateway = aGateway();
  const chargesBefore = gateway.charges.length;
  assert.throws(() => pay('card', 1_000, { cardToken: null }, gateway), {
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
  const gateway = aGateway();
  assert.throws(
    () => pay('cash', 1_000, {}, gateway),
    UnsupportedPaymentMethodError,
  );
});

test('checkout offers every way to pay', () => {
  const names = EVERY_METHOD.map(([method]) => method);
  assert.deepEqual(accepted(), names);
});

test('the Dutch shop charges its own merchant account', () => {
  const dutch = new PaymentGateway({ merchant: DUTCH_SHOP.merchantId });
  const transactionId = pay('card', 2_500, { cardToken: 'tok-4242' }, dutch);
  assert.equal(dutch.merchant, 'shopfront-nl');
  assert.equal(dutch.charges.at(-1)?.id, transactionId);
});

test('one payment, one charge', () => {
  const gateway = aGateway();
  pay('card', 1_000, { cardToken: 'tok-4242' }, gateway);
  assert.equal(gateway.charges.length, 1);
});
