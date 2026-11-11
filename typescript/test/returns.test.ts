import assert from 'node:assert/strict';
import { test } from 'node:test';

import { starterCatalog } from '../src/catalog.ts';
import { OrderBuilder, OrderEvents, placeOrder } from '../src/orders.ts';
import { Card, GiftCard } from '../src/payments.ts';
import { GiftReturn, Refunds, Return } from '../src/returns.ts';
import { GERMAN_SHOP } from '../src/settings.ts';
import { Mailer } from '../src/vendor/mailer.ts';
import { PaymentGateway } from '../src/vendor/paymentGateway.ts';

// A new payment gateway of the German shop, for one test.
function aGateway(): PaymentGateway {
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
  const refundId = new GiftReturn(order, details, gateway).process();
  assert.deepEqual(gateway.refunds.at(-1), {
    id: refundId,
    kind: 'gift_card',
    amount: 3_168,
    detail: 'GIFT-2026-0001',
  });
  assert.equal(order.status, 'returned');
});

const EVERY_RETURN = [
  [Return, { cardToken: 'tok-4242' }, Card],
  [GiftReturn, { code: 'GIFT-2026-0001' }, GiftCard],
] as const;

for (const [ReturnClass, details, expected] of EVERY_RETURN) {
  test(`${ReturnClass.name} creates its destination`, () => {
    const gateway = aGateway();
    const refundsBefore = gateway.refunds.length;
    const destination = new ReturnClass(
      aCardOrder(),
      details,
      gateway,
    ).destination();
    assert.ok(destination instanceof expected);
    assert.equal(gateway.refunds.length, refundsBefore);
  });
}

for (const [ReturnClass, details] of EVERY_RETURN) {
  test(`${ReturnClass.name} returns an order once`, () => {
    const gateway = aGateway();
    const order = aCardOrder();
    new ReturnClass(order, details, gateway).process();
    const refundsBefore = gateway.refunds.length;
    assert.throws(() => new ReturnClass(order, details, gateway).process(), {
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
  const told: string[] = [];
  events.on('refunded', (refunded) => told.push(refunded.status));
  const refunds = new Refunds({
    gateway,
    mailer: new Mailer(),
    shop: GERMAN_SHOP,
    events,
  });

  refunds.refund('SF-00007', { cardToken: 'tok-4242' });

  assert.deepEqual(told, ['returned']);
});
