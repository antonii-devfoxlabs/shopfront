import assert from 'node:assert/strict';
import { test } from 'node:test';

import { starterCatalog } from '../src/catalog.js';
import {
  OrderBook,
  OrderBuilder,
  OrderEvents,
  dispatch,
  placeOrder,
} from '../src/orders.js';
import { Parcel, SWIFTSHIP } from '../src/parcels.js';
import * as services from '../src/services.js';
import { whereIs } from '../src/support.js';

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

test('the support page finds an order in a book of its own', () => {
  const book = new OrderBook();
  services.register('order_book', book);
  const order = aPlacedOrder();
  assert.equal(book.find('SF-00001'), order);
  assert.equal(whereIs('SF-00001'), 'SF-00001 is placed');
});
