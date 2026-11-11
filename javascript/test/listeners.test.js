import assert from 'node:assert/strict';
import { test } from 'node:test';

import { emailShopper, textWarehouse, trackOrder } from '../src/listeners.js';
import { OrderBuilder } from '../src/orders.js';
import { DUTCH_SHOP, GERMAN_SHOP } from '../src/settings.js';
import { Analytics } from '../src/vendor/analytics.js';
import { Mailer } from '../src/vendor/mailer.js';
import { Sms } from '../src/vendor/sms.js';

function anOrder() {
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

test('the email listener thanks the shopper', () => {
  const mailer = new Mailer();
  emailShopper(mailer, GERMAN_SHOP)(anOrder());
  const [email] = mailer.outbox;
  assert.equal(email?.from, 'orders@shopfront.example');
  assert.equal(email?.to, 'ada@example.com');
  assert.match(email?.body ?? '', /^Hi Ada, thank you!/);
  assert.match(email?.body ?? '', /31\.68 EUR/);
});

test("the email listener writes from the shop's own address", () => {
  const mailer = new Mailer();
  emailShopper(mailer, DUTCH_SHOP)(anOrder());
  const [email] = mailer.outbox;
  assert.equal(email?.from, 'orders.nl@shopfront.example');
  assert.equal(email?.subject, 'Shopfront NL: order SF-00007');
});

test('the analytics listener tracks the order and its total', () => {
  const analytics = new Analytics();
  trackOrder(analytics)(anOrder());
  assert.deepEqual(analytics.events, [
    ['order_placed', { order_id: 'SF-00007', total_cents: 3_168 }],
  ]);
});

test('the warehouse listener texts what to pack', () => {
  const sms = new Sms();
  textWarehouse(sms, DUTCH_SHOP)(anOrder());
  assert.deepEqual(sms.outbox, [
    { to: '+44 7700 900200', text: 'Pack SF-00007: 2 x MUG-01' },
  ]);
});
