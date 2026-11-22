import assert from 'node:assert/strict';
import { test } from 'node:test';

import { starterCatalog } from '../src/catalog.js';
import { sales } from '../src/exports.js';
import {
  OrderBook,
  OrderBuilder,
  OrderEvents,
  dispatch,
  placeOrder,
  REFUNDED,
} from '../src/orders.js';
import { Parcel, SWIFTSHIP } from '../src/parcels.js';
import { Refunds } from '../src/returns.js';
import { GERMAN_SHOP } from '../src/settings.js';
import {
  cancel,
  goodwillChoices,
  makeGood,
  whereIs,
} from '../src/support.js';
import { Mailer } from '../src/vendor/mailer.js';
import { PaymentGateway } from '../src/vendor/paymentGateway.js';

function aPlacedOrder(book) {
  const order = new OrderBuilder('SF-00001')
    .email('ada@example.com')
    .name('Ada')
    .lines([['MUG-01', 2]])
    .subtotal(2_500)
    .discount(250)
    .tax(428)
    .shipping(490)
    .country('DE')
    .paidBy('card')
    .transaction('txn-0001')
    .build();
  placeOrder(order, starterCatalog(), book, new OrderEvents());
  return order;
}

test('where is a placed order', () => {
  const book = new OrderBook();
  aPlacedOrder(book);
  assert.equal(whereIs('SF-00001', book), 'SF-00001 is placed');
});

test('where is a dispatched order links its parcel', () => {
  const book = new OrderBook();
  const order = aPlacedOrder(book);
  dispatch(
    order,
    new Parcel({ courier: SWIFTSHIP, number: 'SW-0072' }),
    new OrderEvents(),
  );
  assert.equal(
    whereIs('SF-00001', book),
    'SF-00001 is dispatched: https://swiftship.example/t/SW-0072',
  );
});

test('the support page reads the book it is handed', () => {
  const book = new OrderBook();
  aPlacedOrder(book);
  assert.throws(() => whereIs('SF-00001', new OrderBook()), {
    name: 'UnknownOrderError',
    message: 'SF-00001',
  });
});

test('the support page cancels a placed order', () => {
  const book = new OrderBook();
  const order = aPlacedOrder(book);
  cancel('SF-00001', book);
  assert.equal(whereIs('SF-00001', book), 'SF-00001 is cancelled');
  assert.deepEqual(sales([order]), []);
});

test('a cancelled order is not cancelled again', () => {
  const book = new OrderBook();
  aPlacedOrder(book);
  cancel('SF-00001', book);
  assert.throws(() => cancel('SF-00001', book), {
    name: 'CancelRefusedError',
    message: 'SF-00001 is cancelled',
  });
});

test('a dispatched order is not cancelled', () => {
  const book = new OrderBook();
  const order = aPlacedOrder(book);
  dispatch(
    order,
    new Parcel({ courier: SWIFTSHIP, number: 'SW-0072' }),
    new OrderEvents(),
  );
  assert.throws(() => cancel('SF-00001', book), {
    name: 'CancelRefusedError',
    message: 'SF-00001 is dispatched',
  });
  assert.equal(order.status, 'dispatched');
});

function refundsFor(book, gateway, mailer) {
  return new Refunds({
    gateway,
    mailer,
    shop: GERMAN_SHOP,
    book,
    events: new OrderEvents(),
  });
}

test('the support page makes good on a damaged parcel', () => {
  const book = new OrderBook();
  const order = aPlacedOrder(book);
  dispatch(
    order,
    new Parcel({ courier: SWIFTSHIP, number: 'SW-0072' }),
    new OrderEvents(),
  );
  const gateway = new PaymentGateway({ merchant: GERMAN_SHOP.merchantId });
  const mailer = new Mailer();
  const refunds = refundsFor(book, gateway, mailer);

  makeGood('SF-00001', 'damaged', { cardToken: 'tok-4242' }, refunds);

  assert.equal(gateway.refunds.at(-1)?.amount, 1_584);
  assert.equal(order.status, 'dispatched');
  assert.equal(
    mailer.outbox.at(-1)?.body,
    'Hi Ada, sorry about your parcel: we have refunded 15.84 EUR.',
  );
});

test('a lost parcel gives the whole order back', () => {
  const book = new OrderBook();
  const order = aPlacedOrder(book);
  dispatch(
    order,
    new Parcel({ courier: SWIFTSHIP, number: 'SW-0072' }),
    new OrderEvents(),
  );
  const gateway = new PaymentGateway({ merchant: GERMAN_SHOP.merchantId });
  const refunds = refundsFor(book, gateway, new Mailer());

  makeGood('SF-00001', 'lost', { cardToken: 'tok-4242' }, refunds);

  assert.equal(gateway.refunds.at(-1)?.amount, 3_168);
  assert.equal(order.status, 'dispatched');
});

test('the goodwill form lists every reason', () => {
  assert.deepEqual(goodwillChoices(), [
    'late: 10 % back',
    'damaged: 50 % back',
    'lost: 100 % back',
  ]);
});

test('no goodwill for an order that has not left', () => {
  const book = new OrderBook();
  aPlacedOrder(book);
  const gateway = new PaymentGateway({ merchant: GERMAN_SHOP.merchantId });
  const refunds = refundsFor(book, gateway, new Mailer());
  assert.throws(
    () => makeGood('SF-00001', 'late', { cardToken: 'tok-4242' }, refunds),
    { name: 'GoodwillRefusedError', message: 'SF-00001 is placed' },
  );
  assert.deepEqual(gateway.refunds, []);
});

test('a goodwill credit is not announced as a refund', () => {
  const book = new OrderBook();
  const order = aPlacedOrder(book);
  dispatch(
    order,
    new Parcel({ courier: SWIFTSHIP, number: 'SW-0072' }),
    new OrderEvents(),
  );
  const gateway = new PaymentGateway({ merchant: GERMAN_SHOP.merchantId });
  const events = new OrderEvents();
  const told = [];
  events.on(REFUNDED, (refunded) => told.push(refunded.orderId));
  const refunds = new Refunds({
    gateway,
    mailer: new Mailer(),
    shop: GERMAN_SHOP,
    book,
    events,
  });

  makeGood('SF-00001', 'late', { cardToken: 'tok-4242' }, refunds);

  assert.equal(gateway.refunds.at(-1)?.amount, 316);
  assert.deepEqual(told, []);
});
