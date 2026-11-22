import assert from 'node:assert/strict';
import { test } from 'node:test';

import { OrderBuilder, reorder } from '../src/orders.ts';
import { packingSlip } from '../src/packing.ts';

function anOrder(
  lines: Iterable<[string, number]> = [['MUG-01', 2]],
  orderId = 'SF-00007',
) {
  return new OrderBuilder(orderId)
    .email('ada@example.com')
    .name('Ada')
    .lines(lines)
    .subtotal(2_500)
    .discount(250)
    .tax(428)
    .shipping(490)
    .country('DE')
    .paidBy('card')
    .transaction('txn-0001')
    .build();
}

test('a packing slip lists every line', () => {
  assert.deepEqual(packingSlip(anOrder()), ['2 x MUG-01']);
});

test('a packing slip lists the products in SKU order', () => {
  const order = anOrder([
    ['TEA-02', 1],
    ['KTL-03', 1],
    ['MUG-01', 2],
  ]);
  assert.deepEqual(packingSlip(order), [
    '1 x KTL-03',
    '2 x MUG-01',
    '1 x TEA-02',
  ]);
});

test('a parcel of 40 EUR or more gets a free sample', () => {
  const order = reorder(anOrder(), 'SF-00011')
    .lines([['MUG-01', 4]])
    .subtotal(5_000)
    .tax(950)
    .shipping(0)
    .paidBy('card')
    .transaction('txn-0003')
    .build();
  assert.deepEqual(packingSlip(order), ['4 x MUG-01', '1 x TEA-SAMPLE']);
});
