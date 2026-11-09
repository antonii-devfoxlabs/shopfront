import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Order } from '../src/orders.ts';
import { Card, GiftCard, gateway } from '../src/payments.ts';
import { GiftReturn, Return } from '../src/returns.ts';

function aCardOrder() {
  return new Order(
    'SF-00007',
    'ada@example.com',
    [['MUG-01', 2]],
    2_500,
    250,
    428,
    490,
    'DE',
    'card',
    'txn-0001',
  );
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
