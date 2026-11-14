import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  CsvExport,
  euros,
  JsonExport,
  OrderExport,
  ReturnsCsvExport,
  ReturnsJsonExport,
} from '../src/exports.js';
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
      'SF-00002,ada@example.com,DE,card,19.05\n' +
      'total,2,,,38.10\n',
  );
});

test('CSV ends with the count and the sum of the sales', () => {
  const text = new CsvExport().export([order('SF-00001')]);
  assert.ok(
    text.endsWith(
      'SF-00001,ada@example.com,DE,card,19.05\ntotal,1,,,19.05\n',
    ),
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

test('JSON ends with its records', () => {
  assert.ok(new JsonExport().export(ORDERS).endsWith('  }\n]\n'));
});

test('JSON keeps letters outside ASCII', () => {
  const text = new JsonExport().export([
    order('SF-00001', 'placed', 'zoë@example.com'),
  ]);
  assert.match(text, /"zoë@example\.com"/);
});

test('the returns CSV lists only returned orders', () => {
  assert.equal(
    new ReturnsCsvExport().export(ORDERS),
    'order_id,email,country,payment,total\n' +
      'SF-00004,ada@example.com,DE,card,19.05\n' +
      'total,1,,,19.05\n',
  );
});

test('the returns JSON lists only returned orders', () => {
  const records = JSON.parse(new ReturnsJsonExport().export(ORDERS));
  assert.deepEqual(
    records.map((record) => record.order_id),
    ['SF-00004'],
  );
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

test('euros keeps two digits of cents', () => {
  assert.deepEqual(
    [euros(5), euros(1_905), euros(100_000)],
    ['0.05', '19.05', '1000.00'],
  );
});
