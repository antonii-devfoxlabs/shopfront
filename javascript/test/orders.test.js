import assert from 'node:assert/strict';
import { test } from 'node:test';

import { OutOfStockError, starterCatalog } from '../src/catalog.js';
import {
  OrderBook,
  OrderBuilder,
  UnknownOrderError,
  formatMoney,
  nextOrderId,
  packingSlip,
  placeOrder,
  reorder,
  salesReport,
} from '../src/orders.js';
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

test('the builder puts every part in its place', () => {
  const order = anOrder();
  assert.equal(order.orderId, 'SF-00007');
  assert.equal(order.customerEmail, 'ada@example.com');
  assert.equal(order.customerName, 'Ada');
  assert.deepEqual(order.lines, new Map([['MUG-01', 2]]));
  assert.equal(order.subtotalCents, 2_500);
  assert.equal(order.discountCents, 250);
  assert.equal(order.taxCents, 428);
  assert.equal(order.shippingCents, 490);
  assert.equal(order.shippingCountry, 'DE');
  assert.equal(order.paymentMethod, 'card');
  assert.equal(order.transactionId, 'txn-0001');
});

test('an order without a discount has none', () => {
  const order = new OrderBuilder('SF-00008')
    .email('ada@example.com')
    .name('Ada')
    .lines([['MUG-01', 1]])
    .subtotal(1_250)
    .tax(165)
    .shipping(490)
    .country('DE')
    .paidBy('card')
    .transaction('txn-0002')
    .build();
  assert.equal(order.discountCents, 0);
});

test('an order with a part missing is refused', () => {
  const builder = new OrderBuilder('SF-00009')
    .email('ada@example.com')
    .name('Ada');
  assert.throws(() => builder.build(), {
    name: 'IncompleteOrderError',
    message: 'lines',
  });
});

test('an order again keeps no prices', () => {
  const builder = reorder(anOrder(), 'SF-00010');
  assert.throws(() => builder.build(), {
    name: 'IncompleteOrderError',
    message: 'subtotal',
  });
});

test('the total adds everything up', () => {
  assert.equal(anOrder().totalCents, 3_168);
});

test('a built order cannot change', () => {
  const order = anOrder();
  assert.throws(() => {
    order.taxCents = 0;
  }, TypeError);
  order.lines.set('KTL-03', 9);
  assert.deepEqual(order.lines, new Map([['MUG-01', 2]]));
  assert.equal(order.totalCents, 3_168);
});

test('order ids count up', () => {
  const first = nextOrderId();
  const second = nextOrderId();
  assert.equal(Number(second.slice(3)), Number(first.slice(3)) + 1);
});

test('placing an order takes stock and tells every listener in turn', () => {
  const catalog = starterCatalog();
  const told = [];
  placeOrder(anOrder(), catalog, [
    (order) => told.push(`first ${order.orderId}`),
    (order) => told.push(`second ${order.orderId}`),
  ]);
  assert.equal(catalog.find('MUG-01').stock, 38);
  assert.deepEqual(told, ['first SF-00007', 'second SF-00007']);
});

test('a listener is told once the order is in the book', () => {
  const order = anOrder();
  const found = [];
  placeOrder(order, starterCatalog(), [
    (placed) => found.push(OrderBook.instance().find(placed.orderId)),
  ]);
  assert.deepEqual(found, [order]);
});

test('a placed order is in the order book', () => {
  const order = anOrder();
  placeOrder(order, starterCatalog(), []);
  assert.equal(OrderBook.instance().find('SF-00007'), order);
});

test('the book lists its orders in the order placed', () => {
  const first = anOrder(undefined, 'SF-00001');
  const second = anOrder(undefined, 'SF-00002');
  const catalog = starterCatalog();
  for (const order of [first, second]) {
    placeOrder(order, catalog, []);
  }
  assert.deepEqual(OrderBook.instance().orders(), [first, second]);
});

test('an unknown order number is refused', () => {
  assert.throws(
    () => OrderBook.instance().find('SF-99999'),
    UnknownOrderError,
  );
});

test('every test starts with an empty order book', () => {
  assert.throws(() => OrderBook.instance().find('SF-00007'), {
    message: 'SF-00007',
  });
});

test('every test starts with order number one', () => {
  assert.equal(nextOrderId(), 'SF-00001');
});

test('the store has one order book', () => {
  assert.equal(OrderBook.instance(), OrderBook.instance());
  assert.throws(() => new OrderBook(), /the store has one order book/);
});

test('an order with a short line takes nothing and tells nobody', () => {
  const catalog = starterCatalog();
  const told = [];
  const order = anOrder([
    ['MUG-01', 2],
    ['KTL-03', 9],
  ]);
  assert.throws(
    () => placeOrder(order, catalog, [(placed) => told.push(placed)]),
    OutOfStockError,
  );
  assert.equal(catalog.find('MUG-01').stock, 40);
  assert.deepEqual(told, []);
});

test('a packing slip lists every line', () => {
  assert.deepEqual(packingSlip(anOrder()), ['2 x MUG-01']);
});

test('a parcel of 40 EUR or more gets a free sample', () => {
  const order = reorder(anOrder(), 'SF-00011')
    .lines([['MUG-01', 4]])
    .subtotal(5_000)
    .tax(950)
    .shipping(0)
    .paidBy('card')
    .transaction('txn-0003')
    .build();
  assert.deepEqual(packingSlip(order), ['4 x MUG-01', '1 x TEA-SAMPLE']);
});

test('the sales report counts only the orders kept', () => {
  const kept = anOrder(undefined, 'SF-00001');
  const sentBack = anOrder(undefined, 'SF-00002');
  sentBack.status = 'returned';

  const report = salesReport([kept, sentBack], GERMAN_SHOP);

  assert.equal(report, 'Orders: 1, takings: 31.68 EUR');
});

test('money is shown in euros', () => {
  assert.equal(formatMoney(3_168, GERMAN_SHOP), '31.68 EUR');
  assert.equal(formatMoney(5, GERMAN_SHOP), '0.05 EUR');
  assert.equal(formatMoney(-205, GERMAN_SHOP), '-2.05 EUR');
});
