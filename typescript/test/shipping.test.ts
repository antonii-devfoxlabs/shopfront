import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Cart } from '../src/cart.ts';
import { starterCatalog } from '../src/catalog.ts';
import { settings } from '../src/settings.ts';
import { cartWeightGrams, shippingCost } from '../src/shipping.ts';
import { ParcelNowError } from '../src/vendor/parcelnow.ts';

function cartOf(sku: string, quantity: number): Cart {
  const cart = new Cart();
  cart.add(sku, quantity);
  return cart;
}

test('weight adds every line', () => {
  assert.equal(cartWeightGrams(cartOf('MUG-01', 2), starterCatalog()), 700);
});

test('home orders over the threshold ship free', () => {
  const cart = cartOf('KTL-03', 2);
  assert.equal(shippingCost(cart, starterCatalog(), 'DE', 9_800), 0);
});

test('home orders under the threshold pay ParcelNow', () => {
  const cart = cartOf('MUG-01', 1);
  assert.equal(shippingCost(cart, starterCatalog(), 'DE', 1_250), 490);
});

test('exactly the threshold ships free', () => {
  const cart = cartOf('MUG-01', 4);
  assert.equal(shippingCost(cart, starterCatalog(), 'DE', 5_000), 0);
});

test('heavy home parcels still go by ParcelNow', () => {
  const cart = cartOf('KTL-03', 5);
  // 5.5 kg: the base rate and five extra kilos.
  assert.equal(shippingCost(cart, starterCatalog(), 'DE', 4_000), 1_090);
});

test('exactly five kilos abroad is not freight', () => {
  const cart = cartOf('FLT-05', 50);
  // 4.5 kg: the base rate and four extra kilos.
  assert.equal(shippingCost(cart, starterCatalog(), 'NL', 22_500), 1_270);
  const heavier = cartOf('CUP-04', 9);
  // 5.4 kg is over five kilos, so it goes as freight.
  assert.equal(shippingCost(heavier, starterCatalog(), 'NL', 21_600), 3_500);
});

test('an empty cart pays the base rate', () => {
  assert.equal(shippingCost(new Cart(), starterCatalog(), 'FR', 0), 890);
});

test('the threshold comes from the settings', (context) => {
  const saved = settings.freeShippingFromCents;
  context.after(() => {
    settings.freeShippingFromCents = saved;
  });
  settings.freeShippingFromCents = 1_000;
  const cart = cartOf('MUG-01', 1);
  assert.equal(shippingCost(cart, starterCatalog(), 'DE', 1_250), 0);
});

test('the Dutch shop ships free at home from 60 EUR', (context) => {
  const saved = { ...settings };
  context.after(() => {
    Object.assign(settings, saved);
  });
  settings.homeCountry = 'NL';
  settings.freeShippingFromCents = 6_000;
  const cart = cartOf('MUG-01', 5);
  assert.equal(shippingCost(cart, starterCatalog(), 'NL', 6_000), 0);
  assert.equal(shippingCost(cart, starterCatalog(), 'NL', 5_999), 910);
  // For the Dutch shop, Germany is abroad.
  assert.equal(shippingCost(cart, starterCatalog(), 'DE', 9_800), 610);
});

test('abroad pays even over the threshold', () => {
  const cart = cartOf('KTL-03', 2);
  // 2.2 kg: the base rate and two extra kilos.
  assert.equal(shippingCost(cart, starterCatalog(), 'FR', 9_800), 1_130);
});

test('heavy parcels abroad go as freight', () => {
  const cart = cartOf('KTL-03', 5);
  assert.equal(shippingCost(cart, starterCatalog(), 'NL', 24_500), 3_500);
});

test('ParcelNow does not ship everywhere', () => {
  assert.throws(
    () => shippingCost(cartOf('MUG-01', 1), starterCatalog(), 'US', 1_250),
    ParcelNowError,
  );
});
