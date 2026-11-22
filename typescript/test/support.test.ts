import assert from 'node:assert/strict';
import { test } from 'node:test';

import { starterCatalog } from '../src/catalog.ts';
import {
  OrderBuilder,
  OrderEvents,
  dispatch,
  placeOrder,
} from '../src/orders.ts';
import { Parcel, SWIFTSHIP } from '../src/parcels.ts';
import { whereIs } from '../src/support.ts';

function aPlacedOrder() {
  const order = new OrderBuilder('SF-00001')
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
  placeOrder(order, starterCatalog(), new OrderEvents());
  return order;
}

test('where is a placed order', () => {
  aPlacedOrder();
  assert.equal(whereIs('SF-00001'), 'SF-00001 is placed');
});

test('where is a dispatched order links its parcel', () => {
  const order = aPlacedOrder();
  dispatch(
    order,
    new Parcel({ courier: SWIFTSHIP, number: 'SW-0072' }),
    new OrderEvents(),
  );
  assert.equal(
    whereIs('SF-00001'),
    'SF-00001 is dispatched: https://swiftship.example/t/SW-0072',
  );
});
