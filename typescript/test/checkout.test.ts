// One order through the whole store, the way `npm start` runs it.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Cart } from '../src/cart.ts';
import { starterCatalog } from '../src/catalog.ts';
import { Order, nextOrderId, placeOrder } from '../src/orders.ts';
import { pay } from '../src/payments.ts';
import { PriceCalculator } from '../src/pricing.ts';
import { shippingCost } from '../src/shipping.ts';
import { Analytics } from '../src/vendor/analytics.ts';
import { Mailer } from '../src/vendor/mailer.ts';
import { TaxService } from '../src/vendor/taxService.ts';

test('a whole order', () => {
  const catalog = starterCatalog();
  const cart = new Cart();
  cart.add('MUG-01', 2);
  cart.add('TEA-02');

  const calculator = new PriceCalculator(catalog, new TaxService());
  const quote = calculator.quote(
    cart,
    'DE',
    'WELCOME10',
    new Date(2026, 5, 15),
  );
  const paidCents = quote.subtotalCents - quote.discountCents;
  const shippingCents = shippingCost(cart, catalog, 'DE', paidCents);
  const totalCents = paidCents + quote.taxCents + shippingCents;

  const transactionId = pay('card', totalCents, { cardToken: 'tok-4242' });
  const order = new Order(
    nextOrderId(),
    'ada@example.com',
    cart.lines,
    quote.subtotalCents,
    quote.discountCents,
    quote.taxCents,
    shippingCents,
    'DE',
    'card',
    transactionId,
  );
  const mailer = new Mailer();
  placeOrder(order, catalog, mailer, new Analytics());

  assert.equal(order.totalCents, 4_121);
  assert.equal(catalog.find('MUG-01').stock, 38);
  assert.equal(mailer.outbox.length, 1);
});
