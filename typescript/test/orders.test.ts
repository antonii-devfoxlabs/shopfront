import assert from 'node:assert/strict';
import { test } from 'node:test';

import { OutOfStockError, starterCatalog } from '../src/catalog.ts';
import {
  Order,
  formatMoney,
  nextOrderId,
  placeOrder,
} from '../src/orders.ts';
import { Analytics } from '../src/vendor/analytics.ts';
import { Mailer } from '../src/vendor/mailer.ts';

function anOrder() {
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

test('the total adds everything up', () => {
  assert.equal(anOrder().totalCents, 3_168);
});

test('order ids count up', () => {
  const first = nextOrderId();
  const second = nextOrderId();
  assert.equal(Number(second.slice(3)), Number(first.slice(3)) + 1);
});

test('placing an order takes stock, emails and tracks', () => {
  const catalog = starterCatalog();
  const mailer = new Mailer();
  const analytics = new Analytics();
  placeOrder(anOrder(), catalog, mailer, analytics);
  assert.equal(catalog.find('MUG-01').stock, 38);
  const [email] = mailer.outbox;
  assert.equal(email?.from, 'orders@shopfront.example');
  assert.equal(email?.to, 'ada@example.com');
  assert.match(email?.body ?? '', /31\.68 EUR/);
  assert.deepEqual(analytics.events, [
    ['order_placed', { order_id: 'SF-00007', total_cents: 3_168 }],
  ]);
});

test('an order with a short line takes nothing and sends nothing', () => {
  const catalog = starterCatalog();
  const mailer = new Mailer();
  const analytics = new Analytics();
  const order = anOrder();
  order.lines.set('KTL-03', 9);
  assert.throws(
    () => placeOrder(order, catalog, mailer, analytics),
    OutOfStockError,
  );
  assert.equal(catalog.find('MUG-01').stock, 40);
  assert.deepEqual(mailer.outbox, []);
  assert.deepEqual(analytics.events, []);
});

test('money is shown in euros', () => {
  assert.equal(formatMoney(3_168), '31.68 EUR');
  assert.equal(formatMoney(5), '0.05 EUR');
  assert.equal(formatMoney(-205), '-2.05 EUR');
});
