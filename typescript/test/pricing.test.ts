import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Cart } from '../src/cart.ts';
import { starterCatalog } from '../src/catalog.ts';
import { PriceCalculator, UnknownCouponError } from '../src/pricing.ts';
import { GERMAN_SHOP } from '../src/settings.ts';
import { TaxService, TaxServiceError } from '../src/vendor/taxService.ts';

const A_JUNE_DAY = new Date(2026, 5, 15);
const A_DECEMBER_DAY = new Date(2026, 11, 10);

function calculator() {
  return new PriceCalculator(starterCatalog(), new TaxService(), GERMAN_SHOP);
}

function cartOf(lines: Record<string, number>): Cart {
  const cart = new Cart();
  for (const [sku, quantity] of Object.entries(lines)) {
    cart.add(sku, quantity);
  }
  return cart;
}

test('subtotal adds every line', () => {
  const cart = cartOf({ 'MUG-01': 2, 'TEA-02': 1 });
  assert.equal(calculator().subtotal(cart), 3_390);
});

test('welcome coupon takes ten percent', () => {
  assert.equal(calculator().discount(3_390, 'WELCOME10', A_JUNE_DAY), 339);
});

test('winter coupon only in December', () => {
  const prices = calculator();
  assert.equal(prices.discount(10_000, 'WINTER15', A_DECEMBER_DAY), 1_500);
  assert.throws(
    () => prices.discount(10_000, 'WINTER15', A_JUNE_DAY),
    UnknownCouponError,
  );
});

test('big orders get five percent without a coupon', () => {
  assert.equal(calculator().discount(10_000, null, A_JUNE_DAY), 500);
  assert.equal(calculator().discount(9_999, null, A_JUNE_DAY), 0);
});

test('an unknown coupon is an error', () => {
  assert.throws(
    () => calculator().discount(3_390, 'FREE100', A_JUNE_DAY),
    UnknownCouponError,
  );
});

test('tax is the country rate rounded to the cent', () => {
  assert.equal(calculator().tax(3_051, 'DE'), 580);
  assert.equal(calculator().tax(3_051, 'PL'), 702);
});

test('a quote puts it together', () => {
  const cart = cartOf({ 'MUG-01': 2, 'TEA-02': 1 });
  const quote = calculator().quote(cart, 'DE', {
    today: A_JUNE_DAY,
    coupon: 'WELCOME10',
  });
  assert.deepEqual(quote, {
    subtotalCents: 3_390,
    discountCents: 339,
    taxCents: 580,
  });
});

test('a business abroad pays no VAT', () => {
  const cart = cartOf({ 'MUG-01': 40 });
  const quote = calculator().quote(cart, 'FR', {
    today: A_JUNE_DAY,
    vatId: 'FR12345678901',
  });
  assert.equal(quote.taxCents, 0);
});

test('a business at home pays VAT', () => {
  const cart = cartOf({ 'MUG-01': 40 });
  const quote = calculator().quote(cart, 'DE', {
    today: A_JUNE_DAY,
    vatId: 'DE123456789',
  });
  assert.equal(quote.taxCents, 9_025);
});

test('the tax service is asked once per country', () => {
  const taxService = new TaxService();
  const prices = new PriceCalculator(
    starterCatalog(),
    taxService,
    GERMAN_SHOP,
  );
  for (let round = 0; round < 3; round += 1) {
    prices.quote(cartOf({ 'MUG-01': 1 }), 'DE', { today: A_JUNE_DAY });
  }
  assert.equal(taxService.lookups, 1);
});

test('a country without a VAT rate is an error', () => {
  assert.throws(() => calculator().tax(1_000, 'US'), TaxServiceError);
});
