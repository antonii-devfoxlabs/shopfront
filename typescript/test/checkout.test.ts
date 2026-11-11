// One order through the whole store, the way `npm start` runs it.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setTimeout as sleep } from 'node:timers/promises';

import { Cart } from '../src/cart.ts';
import {
  type Catalog,
  OutOfStockError,
  starterCatalog,
} from '../src/catalog.ts';
import { Checkout, buyAgain } from '../src/checkout.ts';
import { OrderBuilder, nextOrderId, packingSlip } from '../src/orders.ts';
import type { Gateway } from '../src/payments.ts';
import { PriceCalculator, type QuoteOptions } from '../src/pricing.ts';
import {
  boxRouteQuote,
  parcelNowQuote,
  swiftShipQuote,
} from '../src/providers.ts';
import { DUTCH_SHOP, GERMAN_SHOP, type Settings } from '../src/settings.ts';
import { Shipping, offerFor, type ShippingQuote } from '../src/shipping.ts';
import { Analytics } from '../src/vendor/analytics.ts';
import { Mailer } from '../src/vendor/mailer.ts';
import { ParcelNowClient } from '../src/vendor/parcelnow.ts';
import { PaymentGateway } from '../src/vendor/paymentGateway.ts';
import { Sms } from '../src/vendor/sms.ts';
import { SwiftShip } from '../src/vendor/swiftship.ts';
import { TaxService } from '../src/vendor/taxService.ts';

// Every shipping provider, with the shop's ParcelNow account.
function providersFor(shop: Settings): ShippingQuote[] {
  return [
    parcelNowQuote(new ParcelNowClient({ account: shop.parcelNowAccount })),
    swiftShipQuote(new SwiftShip()),
    boxRouteQuote,
  ];
}

const A_MONDAY = new Date(2026, 5, 15);

// The shop's shipping, with the offer its settings name, on a clock that
// says Monday: the offer reads its own clock, so these tests never depend
// on the day they run.
function shippingFor(shop: Settings): Shipping {
  return new Shipping({
    offer: offerFor(shop, () => A_MONDAY),
    providers: providersFor(shop),
    shop,
  });
}

// A new payment gateway of the German shop, for one test.
function aGateway(): PaymentGateway {
  return new PaymentGateway({ merchant: GERMAN_SHOP.merchantId });
}

// A checkout with the real parts, and the test's own to look into.
function checkoutFor(
  shop: Settings,
  catalog: Catalog,
  gateway: Gateway,
  mailer: Mailer,
): Checkout {
  const calculator = new PriceCalculator(catalog, new TaxService(), shop);
  const shipping = shippingFor(shop);
  return new Checkout({
    quote: (cart: Cart, country: string, options: QuoteOptions) =>
      calculator.quote(cart, country, options),
    shippingCost: (
      cart: Cart,
      catalog: Catalog,
      country: string,
      paidCents: number,
    ) => shipping.cost(cart, catalog, country, paidCents),
    catalog,
    gateway,
    mailer,
    analytics: new Analytics(),
    sms: new Sms(),
    shop,
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

test('two shops in one run', async () => {
  async function checkout(shop: Settings, country: string): Promise<number> {
    await sleep(10); // The bank answers.
    const cart = new Cart();
    cart.add('MUG-01', 5);
    return shippingFor(shop).cost(cart, starterCatalog(), country, 6_000);
  }

  const both = await Promise.all([
    checkout(DUTCH_SHOP, 'NL'),
    checkout(GERMAN_SHOP, 'DE'),
  ]);
  assert.deepEqual(both, [0, 0]);
});
