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
import { PARCELNOW, Parcel } from '../src/parcels.js';
import { salesReport } from '../src/reports.js';
import { GERMAN_SHOP } from '../src/settings.js';

function anOrder(lines = [['MUG-01', 2]], orderId = 'SF-00007') {
  return new OrderBuilder(orderId)
    .email('ada@example.com')
    .name('Ada')
    .lines(lines)
    .subtotal(2_500)
    .discount(250)
    .tax(428)
    .shipping(490)
    .country('DE')
    .paidBy('card')
    .transaction('txn-0001')
    .build();
}

const A_PARCEL = new Parcel({ courier: PARCELNOW, number: 'PN-58213' });

test('the sales report counts only the orders kept', () => {
  const kept = anOrder(undefined, 'SF-00001');
  const sentBack = anOrder(undefined, 'SF-00002');
  sentBack.status = 'returned';

  const report = salesReport([kept, sentBack], GERMAN_SHOP);

  assert.equal(report, 'Orders: 1, takings: 31.68 EUR, average: 31.68 EUR');
});

test('the sales report counts dispatched orders', () => {
  const placed = anOrder(undefined, 'SF-00001');
  const dispatched = anOrder(undefined, 'SF-00002');
  dispatch(dispatched, A_PARCEL, new OrderEvents());

  const report = salesReport([placed, dispatched], GERMAN_SHOP);

  assert.equal(report, 'Orders: 2, takings: 63.36 EUR, average: 31.68 EUR');
});

test('the sales report walks the order book itself', () => {
  const catalog = starterCatalog();
  for (const orderId of ['SF-00001', 'SF-00002']) {
    placeOrder(anOrder(undefined, orderId), catalog, new OrderEvents());
  }
  const report = salesReport(OrderBook.instance(), GERMAN_SHOP);
  assert.equal(report, 'Orders: 2, takings: 63.36 EUR, average: 31.68 EUR');
});

test('the sales report walks a cursor once', () => {
  const catalog = starterCatalog();
  for (const orderId of ['SF-00001', 'SF-00002']) {
    placeOrder(anOrder(undefined, orderId), catalog, new OrderEvents());
  }
  const report = salesReport(OrderBook.instance().cursor(), GERMAN_SHOP);
  assert.equal(report, 'Orders: 2, takings: 63.36 EUR, average: 31.68 EUR');
});

test('an empty week averages nothing', () => {
  assert.equal(
    salesReport([], GERMAN_SHOP),
    'Orders: 0, takings: 0.00 EUR, average: 0.00 EUR',
  );
});
