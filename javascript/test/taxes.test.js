import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Cart } from '../src/cart.js';
import { starterCatalog } from '../src/catalog.js';
import { PriceCalculator } from '../src/pricing.js';
import { GERMAN_SHOP } from '../src/settings.js';
import { CachedRates, TimedRates } from '../src/taxes.js';
import { TaxService, TaxServiceError } from '../src/vendor/taxService.js';

test('timed rates pass the answer on', () => {
  const rates = new TimedRates(new TaxService(), () => {});
  assert.equal(rates.rateFor('PL'), 23);
});

test('timed rates log each answer and its time', () => {
  const lines = [];
  const rates = new TimedRates(new TaxService(), (line) => lines.push(line));
  rates.rateFor('DE');
  rates.rateFor('FR');
  assert.equal(lines.length, 2);
  assert.match(lines[0], /^tax rate for DE: 19% in \d+ ms$/);
  assert.match(lines[1], /^tax rate for FR: 20% in \d+ ms$/);
});

test('cached rates ask once per country', () => {
  const taxService = new TaxService();
  const rates = new CachedRates(taxService);
  const answers = ['DE', 'DE', 'FR'].map((country) => rates.rateFor(country));
  assert.deepEqual(answers, [19, 19, 20]);
  assert.equal(taxService.lookups, 2);
});

test('a missing rate is still an error through both', () => {
  const rates = new CachedRates(new TimedRates(new TaxService(), () => {}));
  assert.throws(() => rates.rateFor('US'), TaxServiceError);
});

test('three quotes through the wrappers ask once', () => {
  const taxService = new TaxService();
  const lines = [];
  const taxes = new CachedRates(
    new TimedRates(taxService, (line) => lines.push(line)),
  );
  const prices = new PriceCalculator(starterCatalog(), taxes, GERMAN_SHOP);
  const cart = new Cart();
  cart.add('MUG-01');
  for (let round = 0; round < 3; round += 1) {
    const quote = prices.quote(cart, 'DE', { today: new Date(2026, 5, 15) });
    assert.equal(quote.taxCents, 238);
  }
  assert.equal(taxService.lookups, 1);
  assert.equal(lines.length, 1);
});
