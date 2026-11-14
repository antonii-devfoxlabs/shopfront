import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  CsvExport,
  euros,
  JsonExport,
  OrderExport,
  returns,
  sales,
  save,
} from '../src/exports.ts';
import { type Order, OrderBuilder, type OrderStatus } from '../src/orders.ts';

function order(
  orderId: string,
  status: OrderStatus = 'placed',
  email = 'ada@example.com',
): Order {
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
    new CsvExport(sales).export(ORDERS),
    'order_id,email,country,payment,total\n' +
      'SF-00001,ada@example.com,DE,card,19.05\n' +
      'SF-00002,ada@example.com,DE,card,19.05\n' +
      'total,2,,,38.10\n',
  );
});

test('CSV ends with the count and the sum of the sales', () => {
  const text = new CsvExport(sales).export([order('SF-00001')]);
  assert.ok(
    text.endsWith(
      'SF-00001,ada@example.com,DE,card,19.05\ntotal,1,,,19.05\n',
    ),
  );
});

test('CSV leaves out returned orders', () => {
  const text = new CsvExport(sales).export([
    order('SF-00001'),
    order('SF-00002', 'returned'),
  ]);
  assert.doesNotMatch(text, /SF-00002/);
});

test('JSON leaves out returned orders', () => {
  const text = new JsonExport(sales).export([
    order('SF-00001'),
    order('SF-00002', 'returned'),
  ]);
  assert.doesNotMatch(text, /SF-00002/);
});

test('JSON lists the same orders', () => {
  const records = JSON.parse(new JsonExport(sales).export(ORDERS));
  assert.deepEqual(
    records.map((record: { order_id: string }) => record.order_id),
    ['SF-00001', 'SF-00002'],
  );
  assert.equal(records[0].total, '19.05');
});

test('JSON ends with its records', () => {
  assert.ok(new JsonExport(sales).export(ORDERS).endsWith('  }\n]\n'));
});

test('JSON keeps letters outside ASCII', () => {
  const text = new JsonExport(sales).export([
    order('SF-00001', 'placed', 'zoë@example.com'),
  ]);
  assert.match(text, /"zoë@example\.com"/);
});

test('returns are the returned orders, oldest first', () => {
  const returned = returns([
    order('SF-00006', 'returned'),
    order('SF-00005', 'returned'),
    ...ORDERS,
  ]);
  assert.deepEqual(
    returned.map((sent) => sent.orderId),
    ['SF-00004', 'SF-00005', 'SF-00006'],
  );
});

test('the returns CSV lists only returned orders', () => {
  assert.equal(
    new CsvExport(returns).export(ORDERS),
    'order_id,email,country,payment,total\n' +
      'SF-00004,ada@example.com,DE,card,19.05\n' +
      'total,1,,,19.05\n',
  );
});

test('the returns JSON lists only returned orders', () => {
  const records = JSON.parse(new JsonExport(returns).export(ORDERS));
  assert.deepEqual(
    records.map((record: { order_id: string }) => record.order_id),
    ['SF-00004'],
  );
});

test('a new format defines only its own step', () => {
  class OrderIds extends OrderExport {
    protected override write(records: Record<string, string>[]): string {
      return records.map((sale) => sale['order_id']).join(' ');
    }
  }
  assert.equal(new OrderIds(sales).export(ORDERS), 'SF-00001 SF-00002');
});

test('a new format lists returns with no class of its own', () => {
  class OrderIds extends OrderExport {
    protected override write(records: Record<string, string>[]): string {
      return records.map((sale) => sale['order_id']).join(' ');
    }
  }
  assert.equal(new OrderIds(returns).export(ORDERS), 'SF-00004');
});

test('euros keeps two digits of cents', () => {
  assert.deepEqual(
    [euros(5), euros(1_905), euros(100_000)],
    ['0.05', '19.05', '1000.00'],
  );
});

test('the month is saved as four files', () => {
  const folder = mkdtempSync(join(tmpdir(), 'shopfront-'));
  save(folder, ORDERS);
  assert.deepEqual(readdirSync(folder).sort(), [
    'returns.csv',
    'returns.json',
    'sales.csv',
    'sales.json',
  ]);
  rmSync(folder, { recursive: true });
});

test("the saved sales CSV is the accountant's file", () => {
  const folder = mkdtempSync(join(tmpdir(), 'shopfront-'));
  save(folder, ORDERS);
  const text = readFileSync(join(folder, 'sales.csv'), 'utf8');
  assert.equal(text, new CsvExport(sales).export(ORDERS));
  rmSync(folder, { recursive: true });
});

test("save never writes over a month's files", () => {
  const folder = mkdtempSync(join(tmpdir(), 'shopfront-'));
  save(folder, ORDERS);
  assert.throws(() => save(folder, []), { code: 'EEXIST' });
});
