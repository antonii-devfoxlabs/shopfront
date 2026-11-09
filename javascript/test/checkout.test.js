// One order through the whole store, the way `npm start` runs it.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setTimeout as sleep } from 'node:timers/promises';

import { Cart } from '../src/cart.js';
import { starterCatalog } from '../src/catalog.js';
import {
  OrderBuilder,
  nextOrderId,
  packingSlip,
  placeOrder,
  reorder,
} from '../src/orders.js';
import { pay } from '../src/payments.js';
import { PriceCalculator } from '../src/pricing.js';
import { DUTCH_SHOP, GERMAN_SHOP } from '../src/settings.js';
import {
  ParcelNowQuote,
  SwiftShipQuote,
  shippingCost,
} from '../src/shipping.js';
import { Analytics } from '../src/vendor/analytics.js';
import { Mailer } from '../src/vendor/mailer.js';
import { ParcelNowClient } from '../src/vendor/parcelnow.js';
import { PaymentGateway } from '../src/vendor/paymentGateway.js';
import { SwiftShip } from '../src/vendor/swiftship.js';
import { TaxService } from '../src/vendor/taxService.js';

// Both shipping providers, with the shop's ParcelNow account.
function providersFor(shop) {
  return [
    new ParcelNowQuote(
      new ParcelNowClient({ account: shop.parcelNowAccount }),
    ),
    new SwiftShipQuote(new SwiftShip()),
  ];
}

// A new payment gateway of the German shop, for one test.
function aGateway() {
  return new PaymentGateway({ merchant: GERMAN_SHOP.merchantId });
}

test('a whole order', () => {
  const shop = GERMAN_SHOP;
  const gateway = aGateway();
  const catalog = starterCatalog();
  const cart = new Cart();
  cart.add('MUG-01', 2);
  cart.add('TEA-02');

  const calculator = new PriceCalculator(catalog, new TaxService(), shop);
  const quote = calculator.quote(cart, 'DE', {
    today: new Date(2026, 5, 15),
    coupon: 'WELCOME10',
  });
  const paidCents = quote.subtotalCents - quote.discountCents;
  const shippingCents = shippingCost(
    cart,
    catalog,
    'DE',
    paidCents,
    providersFor(shop),
    shop,
  );
  const totalCents = paidCents + quote.taxCents + shippingCents;

  const transactionId = pay(
    'card',
    totalCents,
    { cardToken: 'tok-4242' },
    gateway,
  );
  const order = new OrderBuilder(nextOrderId())
    .email('ada@example.com')
    .name('Ada')
    .lines(cart.lines)
    .subtotal(quote.subtotalCents)
    .discount(quote.discountCents)
    .tax(quote.taxCents)
    .shipping(shippingCents)
    .country('DE')
    .paidBy('card')
    .transaction(transactionId)
    .build();
  const mailer = new Mailer();
  placeOrder(order, catalog, mailer, new Analytics(), shop);

  assert.equal(order.totalCents, 4_121);
  assert.equal(catalog.find('MUG-01').stock, 38);
  assert.equal(mailer.outbox.length, 1);
});

test('ordering again', () => {
  const shop = GERMAN_SHOP;
  const gateway = aGateway();
  const catalog = starterCatalog();
  const previous = new OrderBuilder(nextOrderId())
    .email('ada@example.com')
    .name('Ada')
    .lines([
      ['MUG-01', 2],
      ['TEA-02', 1],
    ])
    .subtotal(3_390)
    .discount(339)
    .tax(580)
    .shipping(490)
    .country('DE')
    .paidBy('card')
    .transaction('txn-0001')
    .build();
  assert.equal(packingSlip(previous).at(-1), '1 x TEA-SAMPLE');
  const builder = reorder(previous, nextOrderId());
  const cart = new Cart();
  for (const [sku, quantity] of previous.lines) cart.add(sku, quantity);
  const country = previous.shippingCountry;

  const calculator = new PriceCalculator(catalog, new TaxService(), shop);
  const quote = calculator.quote(cart, country, {
    today: new Date(2026, 6, 15),
  });
  builder.subtotal(quote.subtotalCents);
  builder.discount(quote.discountCents);
  builder.tax(quote.taxCents);

  const paidCents = quote.subtotalCents - quote.discountCents;
  const shippingCents = shippingCost(
    cart,
    catalog,
    country,
    paidCents,
    providersFor(shop),
    shop,
  );
  builder.shipping(shippingCents);

  const totalCents = paidCents + quote.taxCents + shippingCents;
  const transactionId = pay(
    'card',
    totalCents,
    { cardToken: 'tok-4242' },
    gateway,
  );
  builder.paidBy('card').transaction(transactionId);
  const order = builder.build();

  assert.notEqual(order.orderId, previous.orderId);
  assert.equal(order.customerName, 'Ada');
  assert.deepEqual(order.lines, previous.lines);
  assert.equal(order.shippingCountry, 'DE');
  assert.equal(order.taxCents, 644);
  assert.equal(order.totalCents, 4_524);
});

test('two shops in one run', async () => {
  async function checkout(shop, country) {
    await sleep(10); // The bank answers.
    const cart = new Cart();
    cart.add('MUG-01', 5);
    return shippingCost(
      cart,
      starterCatalog(),
      country,
      6_000,
      providersFor(shop),
      shop,
    );
  }

  const both = await Promise.all([
    checkout(DUTCH_SHOP, 'NL'),
    checkout(GERMAN_SHOP, 'DE'),
  ]);
  assert.deepEqual(both, [0, 0]);
});
