import assert from 'node:assert/strict';
import { test } from 'node:test';

import { starterCatalog } from '../src/catalog.ts';
import { sales } from '../src/exports.ts';
import {
  OrderBook,
  OrderBuilder,
  OrderEvents,
  dispatch,
  placeOrder,
} from '../src/orders.ts';
import { Parcel, SWIFTSHIP } from '../src/parcels.ts';
import { cancel, whereIs } from '../src/support.ts';

function aPlacedOrder(book: OrderBook) {
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
  placeOrder(order, starterCatalog(), book, new OrderEvents());
  return order;
}

test('where is a placed order', () => {
  const book = new OrderBook();
  aPlacedOrder(book);
  assert.equal(whereIs('SF-00001', book), 'SF-00001 is placed');
});

test('where is a dispatched order links its parcel', () => {
  const book = new OrderBook();
  const order = aPlacedOrder(book);
  dispatch(
    order,
    new Parcel({ courier: SWIFTSHIP, number: 'SW-0072' }),
    new OrderEvents(),
  );
  assert.equal(
    whereIs('SF-00001', book),
    'SF-00001 is dispatched: https://swiftship.example/t/SW-0072',
  );
});

test('the support page reads the book it is handed', () => {
  const book = new OrderBook();
  aPlacedOrder(book);
  assert.throws(() => whereIs('SF-00001', new OrderBook()), {
    name: 'UnknownOrderError',
    message: 'SF-00001',
  });
});

test('the support page cancels a placed order', () => {
  const book = new OrderBook();
  const order = aPlacedOrder(book);
  cancel('SF-00001', book);
  assert.equal(whereIs('SF-00001', book), 'SF-00001 is cancelled');
  assert.deepEqual(sales([order]), []);
});

test('a cancelled order is not cancelled again', () => {
  const book = new OrderBook();
  aPlacedOrder(book);
  cancel('SF-00001', book);
  assert.throws(() => cancel('SF-00001', book), {
    name: 'CancelRefusedError',
    message: 'SF-00001 is cancelled',
  });
});
