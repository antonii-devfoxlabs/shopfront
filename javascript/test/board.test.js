import assert from 'node:assert/strict';
import { test } from 'node:test';

import { SalesBoard } from '../src/board.js';
import { OrderBuilder, OrderEvents, PLACED } from '../src/orders.js';
import { GERMAN_SHOP } from '../src/settings.js';

/** @param {string} orderId */
function anOrder(orderId) {
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
  events.emit(PLACED, anOrder('SF-00001'));
  events.emit(PLACED, anOrder('SF-00002'));
  assert.deepEqual(board.rows, [
    'SF-00001  31.68 EUR',
    'SF-00002  31.68 EUR',
  ]);
});

test('a closed board is cleared', () => {
  const events = new OrderEvents();
  const board = new SalesBoard(events, GERMAN_SHOP);
  events.emit(PLACED, anOrder('SF-00001'));
  board.close();
  assert.deepEqual(board.rows, []);
});

test('a closed board is told nothing more and leaves no listener', () => {
  const events = new OrderEvents();
  const board = new SalesBoard(events, GERMAN_SHOP);
  board.close();
  events.emit(PLACED, anOrder('SF-00001'));
  assert.deepEqual(board.rows, []);
  assert.equal(events.listenerCount(PLACED), 0);
});
