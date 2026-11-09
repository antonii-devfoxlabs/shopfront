import assert from 'node:assert/strict';
import { test } from 'node:test';

import { starterCatalog } from '../src/catalog.ts';
import { OrderBuilder, placeOrder } from '../src/orders.ts';
import { Card, GiftCard, gateway } from '../src/payments.ts';
import { GiftReturn, Return, returnOrder } from '../src/returns.ts';
import { Analytics } from '../src/vendor/analytics.ts';
import { Mailer } from '../src/vendor/mailer.ts';

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
  const order = aCardOrder();
  const refundId = new Return(order, { cardToken: 'tok-4242' }).process();
  assert.deepEqual(gateway.refunds.at(-1), {
    id: refundId,
    kind: 'card',
    amount: 3_168,
    detail: null,
  });
  assert.equal(order.status, 'returned');
});

test('an order is returned by its number', () => {
  const order = aCardOrder();
  placeOrder(order, starterCatalog(), new Mailer(), new Analytics());
  const refundId = returnOrder('SF-00007', { cardToken: 'tok-4242' });
  assert.equal(gateway.refunds.at(-1)?.id, refundId);
  assert.equal(order.status, 'returned');
});

test('a gift return refunds onto a gift card', () => {
  const order = aCardOrder();
  const details = { code: 'GIFT-2026-0001' };
  const refundId = new GiftReturn(order, details).process();
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
    const refundsBefore = gateway.refunds.length;
    const destination = new ReturnClass(aCardOrder(), details).destination();
    assert.ok(destination instanceof expected);
    assert.equal(gateway.refunds.length, refundsBefore);
  });
}

for (const [ReturnClass, details] of EVERY_RETURN) {
  test(`${ReturnClass.name} returns an order once`, () => {
    const order = aCardOrder();
    new ReturnClass(order, details).process();
    const refundsBefore = gateway.refunds.length;
    assert.throws(() => new ReturnClass(order, details).process(), {
      name: 'ReturnRefusedError',
      message: 'SF-00007 is returned',
    });
    assert.equal(gateway.refunds.length, refundsBefore);
  });
}
