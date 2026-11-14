import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CsvExport, JsonExport, OrderExport } from '../src/exports.js';
import { OrderBuilder } from '../src/orders.js';

function order(orderId, status = 'placed', email = 'ada@example.com') {
  const placed = new OrderBuilder(orderId)
    .email(email)
    .name('Ada')
    .lines([['MUG-01', 1]])
    .subtotal(1_250)
    .tax(165)
    .shipping(490)
    .country('DE')
    .paidBy('card')
    .transaction('txn-0001')
    .build();
  placed.status = status;
  return placed;
}

const ORDERS = [
  order('SF-00002'),
  order('SF-00001'),
  order('SF-00003', 'cancelled'),
  order('SF-00004', 'returned'),
];

test('CSV lists placed orders in order', () => {
  assert.equal(
    new CsvExport().export(ORDERS),
    'order_id,email,country,payment,total\n' +
      'SF-00001,ada@example.com,DE,card,19.05\n' +
      'SF-00002,ada@example.com,DE,card,19.05\n',
  );
});

test('CSV leaves out returned orders', () => {
  const text = new CsvExport().export([
    order('SF-00001'),
    order('SF-00002', 'returned'),
  ]);
  assert.doesNotMatch(text, /SF-00002/);
});

test('JSON leaves out returned orders', () => {
  const text = new JsonExport().export([
    order('SF-00001'),
    order('SF-00002', 'returned'),
  ]);
  assert.doesNotMatch(text, /SF-00002/);
});

test('JSON lists the same orders', () => {
  const records = JSON.parse(new JsonExport().export(ORDERS));
  assert.deepEqual(
    records.map((record) => record.order_id),
    ['SF-00001', 'SF-00002'],
  );
  assert.equal(records[0].total, '19.05');
});

test('JSON keeps letters outside ASCII', () => {
  const text = new JsonExport().export([
    order('SF-00001', 'placed', 'zoë@example.com'),
  ]);
  assert.match(text, /"zoë@example\.com"/);
});

test('a new format defines only its own step', () => {
  class OrderIds extends OrderExport {
    write(records) {
      return records.map((sale) => sale.order_id).join(' ');
    }
  }
  assert.equal(new OrderIds().export(ORDERS), 'SF-00001 SF-00002');
});

test('an export without its own write says what is missing', () => {
  assert.throws(() => new OrderExport().export(ORDERS), {
    message: 'A subclass of OrderExport must define write()',
  });
});
