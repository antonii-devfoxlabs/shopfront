import assert from 'node:assert/strict';
import { test } from 'node:test';

import { OutOfStockError, starterCatalog } from '../src/catalog.ts';
import {
  OrderBook,
  OrderBuilder,
  UnknownOrderError,
  formatMoney,
  nextOrderId,
  packingSlip,
  placeOrder,
  reorder,
} from '../src/orders.ts';
import * as settings from '../src/settings.ts';
import { Analytics } from '../src/vendor/analytics.ts';
import { Mailer } from '../src/vendor/mailer.ts';

function anOrder(lines: Iterable<[string, number]> = [['MUG-01', 2]]) {
  return new OrderBuilder('SF-00007')
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
    (order as { taxCents: number }).taxCents = 0;
  }, TypeError);
  (order.lines as Map<string, number>).set('KTL-03', 9);
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
  placeOrder(anOrder(), catalog, mailer, analytics);
  assert.equal(catalog.find('MUG-01').stock, 38);
  const [email] = mailer.outbox;
  assert.equal(email?.from, 'orders@shopfront.example');
  assert.equal(email?.to, 'ada@example.com');
  assert.match(email?.body ?? '', /^Hi Ada, thank you!/);
  assert.match(email?.body ?? '', /31\.68 EUR/);
  assert.deepEqual(analytics.events, [
    ['order_placed', { order_id: 'SF-00007', total_cents: 3_168 }],
  ]);
});

test('a placed order is in the order book', () => {
  const order = anOrder();
  placeOrder(order, starterCatalog(), new Mailer(), new Analytics());
  assert.equal(OrderBook.instance().find('SF-00007'), order);
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
});

test('the Dutch shop emails from its own address', (context) => {
  const previous = settings.use(settings.DUTCH_SHOP);
  context.after(() => settings.use(previous));
  const mailer = new Mailer();
  placeOrder(anOrder(), starterCatalog(), mailer, new Analytics());
  const [email] = mailer.outbox;
  assert.equal(email?.from, 'orders.nl@shopfront.example');
  assert.equal(email?.subject, 'Shopfront NL: order SF-00007');
});

test('an order with a short line takes nothing and sends nothing', () => {
  const catalog = starterCatalog();
  const mailer = new Mailer();
  const analytics = new Analytics();
  const order = anOrder([
    ['MUG-01', 2],
    ['KTL-03', 9],
  ]);
  assert.throws(
    () => placeOrder(order, catalog, mailer, analytics),
    OutOfStockError,
  );
  assert.equal(catalog.find('MUG-01').stock, 40);
  assert.deepEqual(mailer.outbox, []);
  assert.deepEqual(analytics.events, []);
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

test('money is shown in euros', () => {
  assert.equal(formatMoney(3_168), '31.68 EUR');
  assert.equal(formatMoney(5), '0.05 EUR');
  assert.equal(formatMoney(-205), '-2.05 EUR');
});
