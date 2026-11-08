import assert from 'node:assert/strict';
import { test } from 'node:test';

import { exportCsv, exportJson } from '../src/exports.ts';
import { Order, type OrderStatus } from '../src/orders.ts';

function order(
  orderId: string,
  status: OrderStatus = 'placed',
  email = 'ada@example.com',
): Order {
  const placed = new Order(
    orderId,
    email,
    [['MUG-01', 1]],
    1_250,
    0,
    165,
    490,
    'DE',
    'card',
    'txn-0001',
  );
  placed.status = status;
  return placed;
}

const ORDERS = [
  order('SF-00002'),
  order('SF-00001'),
  order('SF-00003', 'cancelled'),
];

test('CSV lists placed orders in order', () => {
  assert.equal(
    exportCsv(ORDERS),
    'order_id,email,country,payment,total\n' +
      'SF-00001,ada@example.com,DE,card,19.05\n' +
      'SF-00002,ada@example.com,DE,card,19.05\n',
  );
});

test('JSON lists the same orders', () => {
  const records = JSON.parse(exportJson(ORDERS));
  assert.deepEqual(
    records.map((record: { order_id: string }) => record.order_id),
    ['SF-00001', 'SF-00002'],
  );
  assert.equal(records[0].total, '19.05');
});

test('JSON keeps letters outside ASCII', () => {
  const text = exportJson([order('SF-00001', 'placed', 'zoë@example.com')]);
  assert.match(text, /"zoë@example\.com"/);
});
