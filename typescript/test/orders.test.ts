import assert from 'node:assert/strict';
import { test } from 'node:test';

import { OutOfStockError, starterCatalog } from '../src/catalog.ts';
import {
  type Order,
  OrderBook,
  OrderBuilder,
  OrderEvents,
  type OrderListener,
  UnknownOrderError,
  dispatch,
  nextOrderId,
  placeOrder,
  reorder,
  statusOf,
} from '../src/orders.ts';
import { PARCELNOW, Parcel } from '../src/parcels.ts';

function anOrder(
  lines: Iterable<[string, number]> = [['MUG-01', 2]],
  orderId = 'SF-00007',
) {
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

// The subject's list, with these listeners of 'placed' in turn.
function eventsOf(...listeners: OrderListener[]): OrderEvents {
  const events = new OrderEvents();
  for (const listener of listeners) events.on('placed', listener);
  return events;
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

test('placing an order takes stock and tells every listener in turn', () => {
  const book = new OrderBook();
  const catalog = starterCatalog();
  const told: string[] = [];
  placeOrder(
    anOrder(),
    catalog,
    book,
    eventsOf(
      (order) => told.push(`first ${order.orderId}`),
      (order) => told.push(`second ${order.orderId}`),
    ),
  );
  assert.equal(catalog.find('MUG-01').stock, 38);
  assert.deepEqual(told, ['first SF-00007', 'second SF-00007']);
});

test('a listener is told once the order is in the book', () => {
  const book = new OrderBook();
  const order = anOrder();
  const found: Order[] = [];
  placeOrder(
    order,
    starterCatalog(),
    book,
    eventsOf((placed) => found.push(book.find(placed.orderId))),
  );
  assert.deepEqual(found, [order]);
});

test('a placed order is in the order book', () => {
  const book = new OrderBook();
  const order = anOrder();
  placeOrder(order, starterCatalog(), book, new OrderEvents());
  assert.equal(book.find('SF-00007'), order);
});

test('the book lists its orders in the order placed', () => {
  const book = new OrderBook();
  const first = anOrder(undefined, 'SF-00001');
  const second = anOrder(undefined, 'SF-00002');
  const catalog = starterCatalog();
  for (const order of [first, second]) {
    placeOrder(order, catalog, book, new OrderEvents());
  }
  assert.deepEqual(book.orders(), [first, second]);
});

test('the staff page shows the newest orders first', () => {
  const book = new OrderBook();
  const first = anOrder(undefined, 'SF-00001');
  const second = anOrder(undefined, 'SF-00002');
  const third = anOrder(undefined, 'SF-00003');
  const catalog = starterCatalog();
  for (const order of [first, second, third]) {
    placeOrder(order, catalog, book, new OrderEvents());
  }
  assert.deepEqual(book.cursor().take(2).toArray(), [third, second]);
  assert.deepEqual(book.cursor().drop(2).take(2).toArray(), [first]);
  assert.deepEqual(book.cursor().drop(4).take(2).toArray(), []);
});

test('an unknown order number is refused', () => {
  const book = new OrderBook();
  assert.throws(() => book.find('SF-99999'), UnknownOrderError);
});

test('every test starts with an empty order book', () => {
  const book = new OrderBook();
  assert.throws(() => book.find('SF-00007'), {
    message: 'SF-00007',
  });
});

test('every test starts with order number one', () => {
  assert.equal(nextOrderId(), 'SF-00001');
});

test('an order with a short line takes nothing and tells nobody', () => {
  const book = new OrderBook();
  const catalog = starterCatalog();
  const told: Order[] = [];
  const order = anOrder([
    ['MUG-01', 2],
    ['KTL-03', 9],
  ]);
  assert.throws(
    () =>
      placeOrder(
        order,
        catalog,
        book,
        eventsOf((placed) => told.push(placed)),
      ),
    OutOfStockError,
  );
  assert.equal(catalog.find('MUG-01').stock, 40);
  assert.deepEqual(told, []);
});

test('the status table says what exchanged means', () => {
  const order = anOrder();
  order.status = 'exchanged';
  assert.deepEqual(statusOf(order), {
    sale: true,
    returnable: true,
    dispatchable: true,
  });
});

test('the status table says what dispatched means', () => {
  const order = anOrder();
  order.status = 'dispatched';
  assert.deepEqual(statusOf(order), {
    sale: true,
    returnable: true,
    dispatchable: false,
  });
});

test('a placed order is dispatched once', () => {
  const order = anOrder();
  dispatch(order, A_PARCEL, new OrderEvents());
  assert.equal(order.status, 'dispatched');
  assert.throws(() => dispatch(order, A_PARCEL, new OrderEvents()), {
    name: 'DispatchRefusedError',
    message: 'SF-00007 is dispatched',
  });
});

test('a placed order has no tracking link yet', () => {
  assert.equal(anOrder().trackingLink(), null);
});

test('a dispatched order links to its parcel', () => {
  const order = anOrder();
  dispatch(order, A_PARCEL, new OrderEvents());
  assert.equal(
    order.trackingLink(),
    'https://parcelnow.example/track/PN-58213',
  );
});

test('dispatch keeps the parcel and tells who listens', () => {
  const order = anOrder();
  const events = new OrderEvents();
  const told: string[] = [];
  events.on('dispatched', (sent) => told.push(sent.orderId));

  dispatch(order, A_PARCEL, events);

  assert.equal(order.parcel, A_PARCEL);
  assert.deepEqual(told, ['SF-00007']);
});

test('cancelling takes the listener off the list', () => {
  const events = new OrderEvents();
  const told: string[] = [];
  const cancel = events.subscribe('placed', (order) =>
    told.push(order.orderId),
  );
  events.emit('placed', anOrder(undefined, 'SF-00001'));
  cancel();
  events.emit('placed', anOrder(undefined, 'SF-00002'));
  assert.deepEqual(told, ['SF-00001']);
  assert.equal(events.listenerCount('placed'), 0);
});

test('cancelling twice is fine', () => {
  const events = new OrderEvents();
  const cancel = events.subscribe('placed', () => {});
  cancel();
  cancel();
  assert.equal(events.listenerCount('placed'), 0);
});
