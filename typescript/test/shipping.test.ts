import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Cart } from '../src/cart.ts';
import { starterCatalog } from '../src/catalog.ts';
import { DUTCH_SHOP, GERMAN_SHOP, type Settings } from '../src/settings.ts';
import {
  BoxRouteQuote,
  ParcelNowQuote,
  type ShippingQuote,
  SwiftShipQuote,
  cartWeightGrams,
  shippingCost,
} from '../src/shipping.ts';
import { ParcelNowClient, ParcelNowError } from '../src/vendor/parcelnow.ts';
import { SwiftShip } from '../src/vendor/swiftship.ts';

function cartOf(sku: string, quantity: number): Cart {
  const cart = new Cart();
  cart.add(sku, quantity);
  return cart;
}

// Every shipping provider, with the shop's ParcelNow account.
function providersFor(shop: Settings): ShippingQuote[] {
  return [
    new ParcelNowQuote(
      new ParcelNowClient({ account: shop.parcelNowAccount }),
    ),
    new SwiftShipQuote(new SwiftShip()),
    new BoxRouteQuote(),
  ];
}

test('weight adds every line', () => {
  assert.equal(cartWeightGrams(cartOf('MUG-01', 2), starterCatalog()), 700);
});

test('home orders over the threshold ship free', () => {
  const cart = cartOf('KTL-03', 2);
  assert.equal(
    shippingCost(
      cart,
      starterCatalog(),
      'DE',
      9_800,
      providersFor(GERMAN_SHOP),
      GERMAN_SHOP,
    ),
    0,
  );
});

test('home orders under the threshold pay the cheaper provider', () => {
  const cart = cartOf('MUG-01', 1);
  // 350 g: SwiftShip's minimum, 3.90, beats ParcelNow's 4.90.
  assert.equal(
    shippingCost(
      cart,
      starterCatalog(),
      'DE',
      1_250,
      providersFor(GERMAN_SHOP),
      GERMAN_SHOP,
    ),
    390,
  );
});

test('exactly the threshold ships free', () => {
  const cart = cartOf('MUG-01', 4);
  assert.equal(
    shippingCost(
      cart,
      starterCatalog(),
      'DE',
      5_000,
      providersFor(GERMAN_SHOP),
      GERMAN_SHOP,
    ),
    0,
  );
});

test('heavy home parcels still go by ParcelNow', () => {
  const cart = cartOf('KTL-03', 5);
  // 5.5 kg: the base rate and five extra kilos.
  assert.equal(
    shippingCost(
      cart,
      starterCatalog(),
      'DE',
      4_000,
      providersFor(GERMAN_SHOP),
      GERMAN_SHOP,
    ),
    1_090,
  );
});

test('exactly five kilos abroad is not freight', () => {
  const cart = cartOf('FLT-05', 50);
  // 4.5 kg: the base rate and four extra kilos.
  assert.equal(
    shippingCost(
      cart,
      starterCatalog(),
      'NL',
      22_500,
      providersFor(GERMAN_SHOP),
      GERMAN_SHOP,
    ),
    1_270,
  );
  const heavier = cartOf('CUP-04', 9);
  // 5.4 kg is over five kilos, so it goes as freight.
  assert.equal(
    shippingCost(
      heavier,
      starterCatalog(),
      'NL',
      21_600,
      providersFor(GERMAN_SHOP),
      GERMAN_SHOP,
    ),
    3_500,
  );
});

test("an empty cart pays SwiftShip's minimum", () => {
  assert.equal(
    shippingCost(
      new Cart(),
      starterCatalog(),
      'FR',
      0,
      providersFor(GERMAN_SHOP),
      GERMAN_SHOP,
    ),
    390,
  );
});

test('a light parcel abroad goes by SwiftShip', () => {
  const cart = cartOf('MUG-01', 2);
  // 700 g to France: SwiftShip 4.90, ParcelNow 8.90.
  assert.equal(
    shippingCost(
      cart,
      starterCatalog(),
      'FR',
      2_500,
      providersFor(GERMAN_SHOP),
      GERMAN_SHOP,
    ),
    490,
  );
});

test('a parcel to Poland goes by BoxRoute', () => {
  const cart = cartOf('MUG-01', 2);
  // 700 g to Poland: BoxRoute 4.50, SwiftShip 5.25, ParcelNow 9.90.
  assert.equal(
    shippingCost(
      cart,
      starterCatalog(),
      'PL',
      2_500,
      providersFor(GERMAN_SHOP),
      GERMAN_SHOP,
    ),
    450,
  );
});

test('the threshold comes from the settings', () => {
  const lower = { ...GERMAN_SHOP, freeShippingFromCents: 1_000 };
  const cart = cartOf('MUG-01', 1);
  assert.equal(
    shippingCost(
      cart,
      starterCatalog(),
      'DE',
      1_250,
      providersFor(lower),
      lower,
    ),
    0,
  );
});

test('the Dutch shop ships free at home from 60 EUR', () => {
  const cart = cartOf('MUG-01', 5);
  assert.equal(
    shippingCost(
      cart,
      starterCatalog(),
      'NL',
      6_000,
      providersFor(DUTCH_SHOP),
      DUTCH_SHOP,
    ),
    0,
  );
  assert.equal(
    shippingCost(
      cart,
      starterCatalog(),
      'NL',
      5_999,
      providersFor(DUTCH_SHOP),
      DUTCH_SHOP,
    ),
    910,
  );
  // For the Dutch shop, Germany is abroad.
  assert.equal(
    shippingCost(
      cart,
      starterCatalog(),
      'DE',
      9_800,
      providersFor(DUTCH_SHOP),
      DUTCH_SHOP,
    ),
    610,
  );
});

test('abroad pays even over the threshold', () => {
  const cart = cartOf('KTL-03', 2);
  // 2.2 kg: the base rate and two extra kilos.
  assert.equal(
    shippingCost(
      cart,
      starterCatalog(),
      'FR',
      9_800,
      providersFor(GERMAN_SHOP),
      GERMAN_SHOP,
    ),
    1_130,
  );
});

test('heavy parcels abroad go as freight', () => {
  const cart = cartOf('KTL-03', 5);
  assert.equal(
    shippingCost(
      cart,
      starterCatalog(),
      'NL',
      24_500,
      providersFor(GERMAN_SHOP),
      GERMAN_SHOP,
    ),
    3_500,
  );
});

test('ParcelNow does not ship everywhere', () => {
  assert.throws(
    () =>
      shippingCost(
        cartOf('MUG-01', 1),
        starterCatalog(),
        'US',
        1_250,
        providersFor(GERMAN_SHOP),
        GERMAN_SHOP,
      ),
    ParcelNowError,
  );
});

test("ParcelNow's adapter answers in cents", () => {
  const client = new ParcelNowClient({
    account: GERMAN_SHOP.parcelNowAccount,
  });
  // 820 g is one started kilo: ParcelNow's '4.90' to Germany.
  assert.equal(new ParcelNowQuote(client).cost(820, 'DE'), 490);
});

test("SwiftShip's adapter answers in cents", () => {
  // 820 g is nine started 100 g steps at 0.60.
  assert.equal(new SwiftShipQuote(new SwiftShip()).cost(820, 'DE'), 540);
});

test("BoxRoute's adapter answers in cents", () => {
  // 2,500 g is three started kilos: 4.50 and two extra kilos at 1.00.
  assert.equal(new BoxRouteQuote().cost(2_500, 'PL'), 650);
});

// A stand-in provider with one price for every parcel.
class Fixed implements ShippingQuote {
  readonly cents: number;

  constructor(cents: number) {
    this.cents = cents;
  }

  cost(): number {
    return this.cents;
  }
}

test('the cheapest provider wins', () => {
  const providers = [new Fixed(700), new Fixed(450)];
  const cart = cartOf('MUG-01', 1);
  assert.equal(
    shippingCost(cart, starterCatalog(), 'FR', 1_250, providers, GERMAN_SHOP),
    450,
  );
});
