// One order through the whole store, the way `npm start` runs it.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setTimeout as sleep } from 'node:timers/promises';

import { Cart } from '../src/cart.js';
import { OutOfStockError, starterCatalog } from '../src/catalog.js';
import { Checkout, buyAgain } from '../src/checkout.js';
import { OrderBuilder, nextOrderId, packingSlip } from '../src/orders.js';
import { PriceCalculator } from '../src/pricing.js';
import {
  boxRouteQuote,
  parcelNowQuote,
  swiftShipQuote,
} from '../src/providers.js';
import { Refunds } from '../src/returns.js';
import { DUTCH_SHOP, GERMAN_SHOP } from '../src/settings.js';
import { shippingCost } from '../src/shipping.js';
import { Analytics } from '../src/vendor/analytics.js';
import { Mailer } from '../src/vendor/mailer.js';
import { ParcelNowClient } from '../src/vendor/parcelnow.js';
import { PaymentGateway } from '../src/vendor/paymentGateway.js';
import { SwiftShip } from '../src/vendor/swiftship.js';
import { TaxService } from '../src/vendor/taxService.js';

// Every shipping provider, with the shop's ParcelNow account.
function providersFor(shop) {
  return [
    parcelNowQuote(new ParcelNowClient({ account: shop.parcelNowAccount })),
    swiftShipQuote(new SwiftShip()),
    boxRouteQuote,
  ];
}

// A new payment gateway of the German shop, for one test.
function aGateway() {
  return new PaymentGateway({ merchant: GERMAN_SHOP.merchantId });
}

// A checkout with the real parts, and the test's own to look into.
function checkoutFor(shop, catalog, gateway, mailer) {
  const calculator = new PriceCalculator(catalog, new TaxService(), shop);
  return new Checkout({
    quote: (cart, country, options) =>
      calculator.quote(cart, country, options),
    shippingCost,
    providers: providersFor(shop),
    catalog,
    gateway,
    mailer,
    analytics: new Analytics(),
    shop,
  });
}

// Ada's order from the demo: two mugs and a tea, to Germany.
function buyAdasOrder(checkout) {
  const cart = new Cart();
  cart.add('MUG-01', 2);
  cart.add('TEA-02');
  return checkout.buy(cart, 'DE', {
    email: 'ada@example.com',
    name: 'Ada',
    paidBy: 'card',
    details: { cardToken: 'tok-4242' },
    today: new Date(2026, 5, 15),
    coupon: 'WELCOME10',
  });
}

test('a whole order', () => {
  const shop = GERMAN_SHOP;
  const catalog = starterCatalog();
  const mailer = new Mailer();
  const cart = new Cart();
  cart.add('MUG-01', 2);
  cart.add('TEA-02');

  const order = checkoutFor(shop, catalog, aGateway(), mailer).buy(
    cart,
    'DE',
    {
      email: 'ada@example.com',
      name: 'Ada',
      paidBy: 'card',
      details: { cardToken: 'tok-4242' },
      today: new Date(2026, 5, 15),
      coupon: 'WELCOME10',
    },
  );

  assert.equal(order.totalCents, 4_121);
  assert.equal(catalog.find('MUG-01').stock, 38);
  assert.equal(mailer.outbox.length, 1);
});

test('an order out of stock charges nothing', () => {
  const shop = GERMAN_SHOP;
  const gateway = aGateway();
  const catalog = starterCatalog();
  const mailer = new Mailer();
  const cart = new Cart();
  cart.add('KTL-03', 9);

  assert.throws(
    () =>
      checkoutFor(shop, catalog, gateway, mailer).buy(cart, 'DE', {
        email: 'ada@example.com',
        name: 'Ada',
        paidBy: 'card',
        details: { cardToken: 'tok-4242' },
        today: new Date(2026, 5, 15),
      }),
    OutOfStockError,
  );

  assert.deepEqual(gateway.charges, []);
  assert.deepEqual(mailer.outbox, []);
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
  const mailer = new Mailer();
  const order = buyAgain(
    checkoutFor(shop, catalog, gateway, mailer),
    previous,
    { cardToken: 'tok-4242' },
    new Date(2026, 6, 15),
  );

  assert.notEqual(order.orderId, previous.orderId);
  assert.equal(order.customerName, 'Ada');
  assert.deepEqual(order.lines, previous.lines);
  assert.equal(order.shippingCountry, 'DE');
  assert.equal(order.taxCents, 644);
  assert.equal(order.totalCents, 4_524);
  assert.equal(catalog.find('MUG-01').stock, 38);
  assert.equal(mailer.outbox.length, 1);
});

test('the sales report counts only the orders kept', () => {
  const gateway = aGateway();
  const checkout = checkoutFor(
    GERMAN_SHOP,
    starterCatalog(),
    gateway,
    new Mailer(),
  );
  buyAdasOrder(checkout);
  const sentBack = buyAdasOrder(checkout);
  const refunds = new Refunds({
    gateway,
    mailer: new Mailer(),
    shop: GERMAN_SHOP,
  });
  refunds.refund(sentBack.orderId, { cardToken: 'tok-4242' });

  assert.equal(checkout.salesReport(), 'Orders: 1, takings: 41.21 EUR');
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
