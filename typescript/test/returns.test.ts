import assert from 'node:assert/strict';
import { test } from 'node:test';

import { OrderBuilder } from '../src/orders.ts';
import { Card, GiftCard } from '../src/payments.ts';
import { GiftReturn, Return } from '../src/returns.ts';
import { GERMAN_SHOP } from '../src/settings.ts';
import { PaymentGateway } from '../src/vendor/paymentGateway.ts';

// A new payment gateway of the German shop, for one test.
function aGateway(): PaymentGateway {
  return new PaymentGateway({ merchant: GERMAN_SHOP.merchantId });
}

function aCardOrder() {
  return new OrderBuilder('SF-00007')
    .email('ada@example.com')
    .name('Ada')
    .lines([['MUG-01', 2]])
    .subtotal(2_500)
    .discount(250)
    .tax(428)
    .shipping(490)
    .country('DE')
    .paidBy('card')
    .transaction('txn-0001')
    .build();
}

test('a return refunds the way the shopper paid', () => {
  const gateway = aGateway();
  const order = aCardOrder();
  const details = { cardToken: 'tok-4242' };
  const refundId = new Return(order, details, gateway).process();
  assert.deepEqual(gateway.refunds.at(-1), {
    id: refundId,
    kind: 'card',
    amount: 3_168,
    detail: null,
  });
  assert.equal(order.status, 'returned');
});

test('a gift return refunds onto a gift card', () => {
  const gateway = aGateway();
  const order = aCardOrder();
  const details = { code: 'GIFT-2026-0001' };
  const refundId = new GiftReturn(order, details, gateway).process();
  assert.deepEqual(gateway.refunds.at(-1), {
    id: refundId,
    kind: 'gift_card',
    amount: 3_168,
    detail: 'GIFT-2026-0001',
  });
  assert.equal(order.status, 'returned');
});

const EVERY_RETURN = [
  [Return, { cardToken: 'tok-4242' }, Card],
  [GiftReturn, { code: 'GIFT-2026-0001' }, GiftCard],
] as const;

for (const [ReturnClass, details, expected] of EVERY_RETURN) {
  test(`${ReturnClass.name} creates its destination`, () => {
    const gateway = aGateway();
    const refundsBefore = gateway.refunds.length;
    const destination = new ReturnClass(
      aCardOrder(),
      details,
      gateway,
    ).destination();
    assert.ok(destination instanceof expected);
    assert.equal(gateway.refunds.length, refundsBefore);
  });
}

for (const [ReturnClass, details] of EVERY_RETURN) {
  test(`${ReturnClass.name} returns an order once`, () => {
    const gateway = aGateway();
    const order = aCardOrder();
    new ReturnClass(order, details, gateway).process();
    const refundsBefore = gateway.refunds.length;
    assert.throws(() => new ReturnClass(order, details, gateway).process(), {
      name: 'ReturnRefusedError',
      message: 'SF-00007 is returned',
    });
    assert.equal(gateway.refunds.length, refundsBefore);
  });
}
