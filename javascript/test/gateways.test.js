import assert from 'node:assert/strict';
import { test } from 'node:test';

import { TimedGateway } from '../src/gateways.js';
import { accepted, pay, refund } from '../src/payments.js';
import { GERMAN_SHOP } from '../src/settings.js';
import {
  DECLINED_TOKEN,
  PaymentDeclinedError,
  PaymentGateway,
} from '../src/vendor/paymentGateway.js';

// A new payment gateway of the German shop, for one test.
function aGateway() {
  return new PaymentGateway({ merchant: GERMAN_SHOP.merchantId });
}

// One set of details that every way to pay can take its own from.
const EVERY_DETAIL = {
  cardToken: 'tok-4242',
  payerEmail: 'ada@example.com',
  walletToken: 'wallet-1',
  orderId: 'SF-00042',
  code: 'GIFT-2026-0001',
};

test('the timed gateway passes each answer on', () => {
  const gateway = aGateway();
  const timed = new TimedGateway(gateway, () => {});
  assert.equal(timed.chargeCard('tok-4242', 1_000), 'txn-0001');
  assert.equal(timed.refundCard('tok-4242', 1_000), 'rfd-0001');
  assert.equal(gateway.charges.at(-1)?.amount, 1_000);
});

test('the timed gateway logs each call and its time', () => {
  const lines = [];
  const timed = new TimedGateway(aGateway(), (line) => lines.push(line));
  timed.chargeCard('tok-4242', 1_000);
  timed.refundCard('tok-4242', 1_000);
  assert.equal(lines.length, 2);
  assert.match(lines[0] ?? '', /^gateway chargeCard in \d+ ms$/);
  assert.match(lines[1] ?? '', /^gateway refundCard in \d+ ms$/);
});

test('a declined card still reaches the caller', () => {
  const lines = [];
  const timed = new TimedGateway(aGateway(), (line) => lines.push(line));
  assert.throws(
    () => timed.chargeCard(DECLINED_TOKEN, 1_000),
    PaymentDeclinedError,
  );
  assert.deepEqual(lines, []);
});

test('every way to pay charges and refunds through it', () => {
  const lines = [];
  const timed = new TimedGateway(aGateway(), (line) => lines.push(line));
  for (const method of accepted()) {
    pay(method, 1_000, EVERY_DETAIL, timed);
    refund(method, 1_000, EVERY_DETAIL, timed);
  }
  const calls = new Set(lines.map((line) => line.split(' ')[1]));
  assert.equal(lines.length, 2 * accepted().length);
  assert.deepEqual(
    calls,
    new Set([
      'chargeCard',
      'chargePaypal',
      'chargeWallet',
      'expectTransfer',
      'redeemGiftCard',
      'refundCard',
      'refundPaypal',
      'refundWallet',
      'sendTransfer',
      'topUpGiftCard',
    ]),
  );
});
