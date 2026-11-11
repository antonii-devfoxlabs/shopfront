import assert from 'node:assert/strict';
import { test } from 'node:test';

import { SalesBoard } from '../src/board.ts';
import { OrderBuilder, OrderEvents } from '../src/orders.ts';
import { GERMAN_SHOP } from '../src/settings.ts';

function anOrder(orderId: string) {
  return new OrderBuilder(orderId)
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

test('a board shows each order placed while it is open', () => {
  const events = new OrderEvents();
  const board = new SalesBoard(events, GERMAN_SHOP);
  events.emit('placed', anOrder('SF-00001'));
  events.emit('placed', anOrder('SF-00002'));
  assert.deepEqual(board.rows, [
    'SF-00001  31.68 EUR',
    'SF-00002  31.68 EUR',
  ]);
});

test('a closed board is cleared', () => {
  const events = new OrderEvents();
  const board = new SalesBoard(events, GERMAN_SHOP);
  events.emit('placed', anOrder('SF-00001'));
  board.close();
  assert.deepEqual(board.rows, []);
});
