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
import { DUTCH_SHOP, GERMAN_SHOP } from '../src/settings.js';
import { Analytics } from '../src/vendor/analytics.js';
import { Mailer } from '../src/vendor/mailer.js';
import { Sms } from '../src/vendor/sms.js';

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

test('placing an order takes stock, emails and tracks', () => {
  const catalog = starterCatalog();
  const mailer = new Mailer();
  const analytics = new Analytics();
  placeOrder(anOrder(), catalog, mailer, analytics, new Sms(), GERMAN_SHOP);
  assert.equal(catalog.find('MUG-01').stock, 38);
  assert.equal(mailer.outbox[0].from, 'orders@shopfront.example');
  assert.equal(mailer.outbox[0].to, 'ada@example.com');
  assert.match(mailer.outbox[0].body, /^Hi Ada, thank you!/);
  assert.match(mailer.outbox[0].body, /31\.68 EUR/);
  assert.deepEqual(analytics.events, [
    ['order_placed', { order_id: 'SF-00007', total_cents: 3_168 }],
  ]);
});

test('placing an order texts the warehouse what to pack', () => {
  const sms = new Sms();
  placeOrder(
    anOrder(),
    starterCatalog(),
    new Mailer(),
    new Analytics(),
    sms,
    DUTCH_SHOP,
  );
  assert.deepEqual(sms.outbox, [
    { to: '+44 7700 900200', text: 'Pack SF-00007: 2 x MUG-01' },
  ]);
});

test('a placed order is in the order book', () => {
  const order = anOrder();
  placeOrder(
    order,
    starterCatalog(),
    new Mailer(),
    new Analytics(),
    new Sms(),
    GERMAN_SHOP,
  );
  assert.equal(OrderBook.instance().find('SF-00007'), order);
});

test('the book lists its orders in the order placed', () => {
  const first = anOrder(undefined, 'SF-00001');
  const second = anOrder(undefined, 'SF-00002');
  const catalog = starterCatalog();
  for (const order of [first, second]) {
    placeOrder(
      order,
      catalog,
      new Mailer(),
      new Analytics(),
      new Sms(),
      GERMAN_SHOP,
    );
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

test('the Dutch shop emails from its own address', () => {
  const mailer = new Mailer();
  placeOrder(
    anOrder(),
    starterCatalog(),
    mailer,
    new Analytics(),
    new Sms(),
    DUTCH_SHOP,
  );
  assert.equal(mailer.outbox[0].from, 'orders.nl@shopfront.example');
  assert.equal(mailer.outbox[0].subject, 'Shopfront NL: order SF-00007');
});

test('an order with a short line takes nothing and sends nothing', () => {
  const catalog = starterCatalog();
  const mailer = new Mailer();
  const analytics = new Analytics();
  const sms = new Sms();
  const order = anOrder([
    ['MUG-01', 2],
    ['KTL-03', 9],
  ]);
  assert.throws(
    () => placeOrder(order, catalog, mailer, analytics, sms, GERMAN_SHOP),
    OutOfStockError,
  );
  assert.equal(catalog.find('MUG-01').stock, 40);
  assert.deepEqual(mailer.outbox, []);
  assert.deepEqual(analytics.events, []);
  assert.deepEqual(sms.outbox, []);
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
