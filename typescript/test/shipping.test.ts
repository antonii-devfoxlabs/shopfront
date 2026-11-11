import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Cart } from '../src/cart.ts';
import { starterCatalog } from '../src/catalog.ts';
import {
  boxRouteQuote,
  parcelNowQuote,
  swiftShipQuote,
} from '../src/providers.ts';
import { DUTCH_SHOP, GERMAN_SHOP, type Settings } from '../src/settings.ts';
import {
  Cheapest,
  Flat,
  FreeFriday,
  FreeOn,
  NoShippingError,
  Shipping,
  type ShippingOffer,
  type ShippingQuote,
  cartWeightGrams,
} from '../src/shipping.ts';
import { ParcelNowClient } from '../src/vendor/parcelnow.ts';
import { SwiftShip } from '../src/vendor/swiftship.ts';

const A_WEDNESDAY = new Date(2026, 6, 15);
const A_FRIDAY = new Date(2026, 6, 17);
const BLACK_FRIDAY = new Date(2026, 10, 27);

function cartOf(sku: string, quantity: number): Cart {
  const cart = new Cart();
  cart.add(sku, quantity);
  return cart;
}

// Every shipping provider, with the shop's ParcelNow account.
function providersFor(shop: Settings): ShippingQuote[] {
  return [
    parcelNowQuote(new ParcelNowClient({ account: shop.parcelNowAccount })),
    swiftShipQuote(new SwiftShip()),
    boxRouteQuote,
  ];
}

// A stand-in offer for the tests about everything else: it never lets an
// order ship free.
const NO_OFFER: ShippingOffer = { shipsFree: (paidCents: number) => false };

// The shop's shipping, with the shop's providers and the offer the test
// hands in.
function shippingFor(shop: Settings, offer: ShippingOffer): Shipping {
  return new Shipping({ offer, providers: providersFor(shop), shop });
}

test('weight adds every line', () => {
  assert.equal(cartWeightGrams(cartOf('MUG-01', 2), starterCatalog()), 700);
});

test('home orders over the threshold ship free', () => {
  const cart = cartOf('KTL-03', 2);
  assert.equal(
    shippingFor(GERMAN_SHOP, NO_OFFER).cost(
      cart,
      starterCatalog(),
      'DE',
      9_800,
    ),
    0,
  );
});

test('home orders under the threshold pay the cheaper provider', () => {
  const cart = cartOf('MUG-01', 1);
  // 350 g: SwiftShip's minimum, 3.90, beats ParcelNow's 4.90.
  assert.equal(
    shippingFor(GERMAN_SHOP, NO_OFFER).cost(
      cart,
      starterCatalog(),
      'DE',
      1_250,
    ),
    390,
  );
});

test('exactly the threshold ships free', () => {
  const cart = cartOf('MUG-01', 4);
  assert.equal(
    shippingFor(GERMAN_SHOP, NO_OFFER).cost(
      cart,
      starterCatalog(),
      'DE',
      5_000,
    ),
    0,
  );
});

test('heavy home parcels still go by ParcelNow', () => {
  const cart = cartOf('KTL-03', 5);
  // 5.5 kg: the base rate and five extra kilos.
  assert.equal(
    shippingFor(GERMAN_SHOP, NO_OFFER).cost(
      cart,
      starterCatalog(),
      'DE',
      4_000,
    ),
    1_090,
  );
});

test('exactly five kilos abroad is not freight', () => {
  const cart = cartOf('FLT-05', 50);
  // 4.5 kg: the base rate and four extra kilos.
  assert.equal(
    shippingFor(GERMAN_SHOP, NO_OFFER).cost(
      cart,
      starterCatalog(),
      'NL',
      22_500,
    ),
    1_270,
  );
  const heavier = cartOf('CUP-04', 9);
  // 5.4 kg is over five kilos, so it goes as freight.
  assert.equal(
    shippingFor(GERMAN_SHOP, NO_OFFER).cost(
      heavier,
      starterCatalog(),
      'NL',
      21_600,
    ),
    3_500,
  );
});

test("an empty cart pays SwiftShip's minimum", () => {
  assert.equal(
    shippingFor(GERMAN_SHOP, NO_OFFER).cost(
      new Cart(),
      starterCatalog(),
      'FR',
      0,
    ),
    390,
  );
});

test('a light parcel abroad goes by SwiftShip', () => {
  const cart = cartOf('MUG-01', 2);
  // 700 g to France: SwiftShip 4.90, ParcelNow 8.90.
  assert.equal(
    shippingFor(GERMAN_SHOP, NO_OFFER).cost(
      cart,
      starterCatalog(),
      'FR',
      2_500,
    ),
    490,
  );
});

test('a parcel to Poland goes by BoxRoute', () => {
  const cart = cartOf('MUG-01', 2);
  // 700 g to Poland: BoxRoute 4.50, SwiftShip 5.25, ParcelNow 9.90.
  assert.equal(
    shippingFor(GERMAN_SHOP, NO_OFFER).cost(
      cart,
      starterCatalog(),
      'PL',
      2_500,
    ),
    450,
  );
});

test('a parcel to Austria goes by SwiftShip', () => {
  const cart = cartOf('MUG-01', 2);
  // 700 g to Austria: only SwiftShip ships there, 7 x 0.80.
  assert.equal(
    shippingFor(GERMAN_SHOP, NO_OFFER).cost(
      cart,
      starterCatalog(),
      'AT',
      2_500,
    ),
    560,
  );
});

test('the threshold comes from the settings', () => {
  const lower = { ...GERMAN_SHOP, freeShippingFromCents: 1_000 };
  const cart = cartOf('MUG-01', 1);
  assert.equal(
    shippingFor(lower, NO_OFFER).cost(cart, starterCatalog(), 'DE', 1_250),
    0,
  );
});

test('the Dutch shop ships free at home from 60 EUR', () => {
  const cart = cartOf('MUG-01', 5);
  assert.equal(
    shippingFor(DUTCH_SHOP, NO_OFFER).cost(
      cart,
      starterCatalog(),
      'NL',
      6_000,
    ),
    0,
  );
  assert.equal(
    shippingFor(DUTCH_SHOP, NO_OFFER).cost(
      cart,
      starterCatalog(),
      'NL',
      5_999,
    ),
    910,
  );
  // For the Dutch shop, Germany is abroad.
  assert.equal(
    shippingFor(DUTCH_SHOP, NO_OFFER).cost(
      cart,
      starterCatalog(),
      'DE',
      9_800,
    ),
    610,
  );
});

test('abroad pays even over the threshold', () => {
  const cart = cartOf('KTL-03', 2);
  // 2.2 kg: the base rate and two extra kilos.
  assert.equal(
    shippingFor(GERMAN_SHOP, NO_OFFER).cost(
      cart,
      starterCatalog(),
      'FR',
      9_800,
    ),
    1_130,
  );
});

test('heavy parcels abroad go as freight', () => {
  const cart = cartOf('KTL-03', 5);
  assert.equal(
    shippingFor(GERMAN_SHOP, NO_OFFER).cost(
      cart,
      starterCatalog(),
      'NL',
      24_500,
    ),
    3_500,
  );
});

test('on Fridays home orders from 40 EUR ship free', () => {
  const cart = cartOf('MUG-01', 4);
  const line = GERMAN_SHOP.freeFridayFromCents;
  const onFriday = new FreeFriday(line, () => A_FRIDAY);
  const onWednesday = new FreeFriday(line, () => A_WEDNESDAY);
  assert.equal(
    shippingFor(GERMAN_SHOP, onFriday).cost(
      cart,
      starterCatalog(),
      'DE',
      4_000,
    ),
    0,
  );
  // The same order on a Wednesday pays the cheapest provider.
  assert.equal(
    shippingFor(GERMAN_SHOP, onWednesday).cost(
      cart,
      starterCatalog(),
      'DE',
      4_000,
    ),
    610,
  );
});

test('the Dutch Free Friday starts at 50 EUR', () => {
  const cart = cartOf('MUG-01', 5);
  const onFriday = new FreeFriday(
    DUTCH_SHOP.freeFridayFromCents,
    () => A_FRIDAY,
  );
  const dutch = shippingFor(DUTCH_SHOP, onFriday);
  assert.equal(dutch.cost(cart, starterCatalog(), 'NL', 5_000), 0);
  // 45.00 EUR is over the German Friday line, not the Dutch one.
  assert.equal(dutch.cost(cart, starterCatalog(), 'NL', 4_500), 910);
});

test('an offer frees only orders at home', () => {
  // A stand-in offer that lets every order ship free.
  const always: ShippingOffer = { shipsFree: (paidCents: number) => true };
  const german = shippingFor(GERMAN_SHOP, always);
  const cart = cartOf('MUG-01', 2);
  assert.equal(german.cost(cart, starterCatalog(), 'DE', 2_500), 0);
  assert.equal(german.cost(cart, starterCatalog(), 'FR', 2_500), 490);
});

test('Switzerland pays a flat price', () => {
  const cart = cartOf('MUG-01', 2);
  // No provider ships to Switzerland; a courier takes it for 9.90.
  assert.equal(
    shippingFor(GERMAN_SHOP, NO_OFFER).cost(
      cart,
      starterCatalog(),
      'CH',
      2_500,
    ),
    990,
  );
});

test('a heavy parcel to Switzerland pays the flat price too', () => {
  const cart = cartOf('KTL-03', 6);
  // 6.6 kg: heavy, but Switzerland's rule is one price for every parcel.
  assert.equal(
    shippingFor(GERMAN_SHOP, NO_OFFER).cost(
      cart,
      starterCatalog(),
      'CH',
      29_400,
    ),
    990,
  );
});

test('nobody ships to Spain', () => {
  assert.throws(
    () =>
      shippingFor(GERMAN_SHOP, NO_OFFER).cost(
        cartOf('MUG-01', 1),
        starterCatalog(),
        'ES',
        1_250,
      ),
    { constructor: NoShippingError, message: 'ES' },
  );
});

test('a flat rule charges every parcel the same', () => {
  const swiss = new Flat(990);
  assert.equal(swiss.cost(350, 'CH'), 990);
  assert.equal(swiss.cost(6_600, 'CH'), 990);
});

test('the cheapest rule says no when nobody ships there', () => {
  function nowhere(grams: number, country: string): number {
    throw new NoShippingError(country);
  }

  assert.throws(() => new Cheapest([nowhere]).cost(350, 'ES'), {
    name: 'NoShippingError',
    message: 'ES',
  });
});

test('free Friday ships free on Fridays from its line', () => {
  const offer = new FreeFriday(4_000, () => A_FRIDAY);
  assert.equal(offer.shipsFree(4_000), true);
  assert.equal(offer.shipsFree(3_999), false);
});

test('free Friday reads its clock every time', () => {
  let today = A_WEDNESDAY;
  const offer = new FreeFriday(4_000, () => today);
  assert.equal(offer.shipsFree(4_000), false);
  today = A_FRIDAY;
  assert.equal(offer.shipsFree(4_000), true);
});

test('Black Friday ships every order free on its day', () => {
  const offer = new FreeOn(BLACK_FRIDAY, () => BLACK_FRIDAY);
  assert.equal(offer.shipsFree(100), true);
});

test('Black Friday says no on any other day', () => {
  const offer = new FreeOn(BLACK_FRIDAY, () => A_FRIDAY);
  assert.equal(offer.shipsFree(9_000), false);
});

test('the cheapest provider wins', () => {
  // Two stand-in providers, each with one price for every parcel.
  const cheapest = new Cheapest([() => 700, () => 450]);
  assert.equal(cheapest.cost(350, 'FR'), 450);
});

test('a provider that does not ship there is skipped', () => {
  function nowhere(grams: number, country: string): number {
    throw new NoShippingError(country);
  }
  assert.equal(new Cheapest([nowhere, () => 700]).cost(350, 'FR'), 700);
});

test('the shipping cost logs nothing itself', () => {
  // main decides what is timed and where its log goes.
  const printed: unknown[] = [];
  const original = console.log;
  console.log = (...line) => printed.push(line);
  try {
    shippingFor(GERMAN_SHOP, NO_OFFER).cost(
      cartOf('MUG-01', 2),
      starterCatalog(),
      'FR',
      2_000,
    );
  } finally {
    console.log = original;
  }
  assert.deepEqual(printed, []);
});
