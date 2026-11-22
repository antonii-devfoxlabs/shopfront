import assert from 'node:assert/strict';
import { test } from 'node:test';

import { starterCatalog } from '../src/catalog.js';
import {
  OrderBuilder,
  OrderEvents,
  REFUNDED,
  dispatch,
  placeOrder,
} from '../src/orders.js';
import { PARCELNOW, Parcel } from '../src/parcels.js';
import { Exchange, Refunds, Return } from '../src/returns.js';
import { GERMAN_SHOP } from '../src/settings.js';
import { Mailer } from '../src/vendor/mailer.js';
import { PaymentGateway } from '../src/vendor/paymentGateway.js';

// A new payment gateway of the German shop, for one test.
function aGateway() {
  return new PaymentGateway({ merchant: GERMAN_SHOP.merchantId });
}

function aCardOrder() {
  return new OrderBuilder('SF-00007')
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
}

test('a return refunds the way the shopper paid', () => {
  const gateway = aGateway();
  const order = aCardOrder();
  const details = { cardToken: 'tok-4242' };
  const refundId = new Return(order, details, gateway).process();
  assert.deepEqual(gateway.refunds.at(-1), {
    id: refundId,
    kind: 'card',
    amount: 3_168,
    detail: null,
  });
  assert.equal(order.status, 'returned');
});

test('an exchange gives no money back', () => {
  const gateway = aGateway();
  const order = aCardOrder();
  new Exchange(order, gateway).process();
  assert.deepEqual(gateway.refunds, []);
  assert.equal(order.status, 'returned');
});

test('a dispatched order can be sent back', () => {
  const order = aCardOrder();
  dispatch(
    order,
    new Parcel({ courier: PARCELNOW, number: 'PN-58213' }),
    new OrderEvents(),
  );
  new Return(order, { cardToken: 'tok-4242' }, aGateway()).process();
  assert.equal(order.status, 'returned');
});

test('a refund gives the money back and tells the shopper', () => {
  const gateway = aGateway();
  const order = aCardOrder();
  placeOrder(order, starterCatalog(), new OrderEvents());
  const mailer = new Mailer();
  const refunds = new Refunds({
    gateway,
    mailer,
    shop: GERMAN_SHOP,
    events: new OrderEvents(),
  });

  const refundId = refunds.refund('SF-00007', { cardToken: 'tok-4242' });

  assert.equal(gateway.refunds.at(-1)?.id, refundId);
  assert.equal(gateway.refunds.at(-1)?.amount, 3_168);
  assert.equal(order.status, 'returned');
  assert.deepEqual(mailer.outbox, [
    {
      from: 'orders@shopfront.example',
      to: 'ada@example.com',
      subject: 'Shopfront: refund for SF-00007',
      body: 'Hi Ada, we have refunded 31.68 EUR.',
    },
  ]);
});

test('a gift return refunds onto a gift card', () => {
  const gateway = aGateway();
  const order = aCardOrder();
  const details = { code: 'GIFT-2026-0001' };
  const refundId = new Return(order, details, gateway, 'gift_card').process();
  assert.deepEqual(gateway.refunds.at(-1), {
    id: refundId,
    kind: 'gift_card',
    amount: 3_168,
    detail: 'GIFT-2026-0001',
  });
  assert.equal(order.status, 'returned');
});

test('a gift sent back to the desk is refunded onto a gift card', () => {
  const gateway = aGateway();
  const order = aCardOrder();
  placeOrder(order, starterCatalog(), new OrderEvents());
  const refunds = new Refunds({
    gateway,
    mailer: new Mailer(),
    shop: GERMAN_SHOP,
    events: new OrderEvents(),
  });

  refunds.refund('SF-00007', { code: 'GIFT-2026-0001' }, 'gift_card');

  assert.equal(gateway.refunds.at(-1)?.kind, 'gift_card');
  assert.equal(gateway.refunds.at(-1)?.detail, 'GIFT-2026-0001');
});

const EVERY_RETURN = [
  [undefined, { cardToken: 'tok-4242' }, 'the card'],
  ['gift_card', { code: 'GIFT-2026-0001' }, 'a gift card'],
];

for (const [to, details, onto] of EVERY_RETURN) {
  test(`a return onto ${onto} returns an order once`, () => {
    const gateway = aGateway();
    const order = aCardOrder();
    new Return(order, details, gateway, to).process();
    const refundsBefore = gateway.refunds.length;
    assert.throws(() => new Return(order, details, gateway, to).process(), {
      name: 'ReturnRefusedError',
      message: 'SF-00007 is returned',
    });
    assert.equal(gateway.refunds.length, refundsBefore);
  });
}

test('a refund is announced once the money is back', () => {
  const gateway = aGateway();
  const order = aCardOrder();
  const events = new OrderEvents();
  placeOrder(order, starterCatalog(), events);
  const told = [];
  events.on(REFUNDED, (refunded) => told.push(refunded.status));
  const refunds = new Refunds({
    gateway,
    mailer: new Mailer(),
    shop: GERMAN_SHOP,
    events,
  });

  refunds.refund('SF-00007', { cardToken: 'tok-4242' });

  assert.deepEqual(told, ['returned']);
});
