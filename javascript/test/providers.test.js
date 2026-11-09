import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  boxRouteQuote,
  parcelNowQuote,
  swiftShipQuote,
} from '../src/providers.js';
import { GERMAN_SHOP } from '../src/settings.js';
import { NoShippingError } from '../src/shipping.js';
import { ParcelNowClient, ParcelNowError } from '../src/vendor/parcelnow.js';
import { SwiftShip } from '../src/vendor/swiftship.js';

test("ParcelNow's adapter answers in cents", () => {
  const client = new ParcelNowClient({
    account: GERMAN_SHOP.parcelNowAccount,
  });
  // 820 g is one started kilo: ParcelNow's '4.90' to Germany.
  const cost = parcelNowQuote(client);
  assert.equal(cost(820, 'DE'), 490);
});

test("SwiftShip's adapter answers in cents", () => {
  // 820 g is nine started 100 g steps at 0.60.
  const cost = swiftShipQuote(new SwiftShip());
  assert.equal(cost(820, 'DE'), 540);
});

test("BoxRoute's adapter answers in cents", () => {
  // 2,500 g is three started kilos: 4.50 and two extra kilos at 1.00.
  assert.equal(boxRouteQuote(2_500, 'PL'), 650);
});

test("ParcelNow's adapter says no in Shopfront's words", () => {
  const client = new ParcelNowClient({
    account: GERMAN_SHOP.parcelNowAccount,
  });
  const cost = parcelNowQuote(client);
  assert.throws(
    () => cost(700, 'ES'),
    (error) => {
      assert.ok(error instanceof NoShippingError);
      assert.equal(error.message, 'ES');
      // ParcelNow's own error stays attached, for whoever debugs it.
      assert.ok(error.cause instanceof ParcelNowError);
      return true;
    },
  );
});

test("SwiftShip's adapter says no in Shopfront's words", () => {
  const cost = swiftShipQuote(new SwiftShip());
  assert.throws(() => cost(700, 'ES'), {
    constructor: NoShippingError,
    message: 'ES',
  });
});

test("BoxRoute's adapter says no in Shopfront's words", () => {
  assert.throws(() => boxRouteQuote(700, 'ES'), {
    constructor: NoShippingError,
    message: 'ES',
  });
});
