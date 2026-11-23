import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Cart } from '../src/cart.js';
import { starterCatalog } from '../src/catalog.js';
import { PriceCalculator } from '../src/pricing.js';
import { GERMAN_SHOP } from '../src/settings.js';
import { CachedRates, RetriedRates, TimedRates } from '../src/taxes.js';
import { timed } from '../src/timing.js';
import {
  TaxService,
  TaxServiceError,
  TaxServiceTimeoutError,
} from '../src/vendor/taxService.js';

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

test('every quote is timed, and only the real lookup', () => {
  // main's order: the quote's timer outside the calculator, the cache
  // outside the tax service's timer. One call cannot show an order;
  // three quotes show both timers.
  const lines = [];
  const log = (line) => lines.push(line);
  const taxes = new CachedRates(new TimedRates(new TaxService(), log));
  const prices = new PriceCalculator(starterCatalog(), taxes, GERMAN_SHOP);
  const timedQuote = timed(
    'price quote',
    (cart, country, options) => prices.quote(cart, country, options),
    log,
  );
  const cart = new Cart();
  cart.add('MUG-01');
  for (let round = 0; round < 3; round += 1) {
    const quote = timedQuote(cart, 'DE', { today: new Date(2026, 5, 15) });
    assert.equal(quote.taxCents, 238);
  }
  assert.deepEqual(
    lines.map((line) => line.replace(/ in \d+ ms$/, '')),
    ['tax rate for DE: 19%', 'price quote', 'price quote', 'price quote'],
  );
});

// Rates that time out on the first lookup, then answer.
class SlowOnce {
  lookups = 0;

  rateFor(country) {
    this.lookups += 1;
    if (this.lookups === 1) {
      throw new TaxServiceTimeoutError('No answer in 10000 ms');
    }
    return 19;
  }
}

test('the tax service gives up after its timeout', () => {
  const taxService = new TaxService({ timeoutMilliseconds: 10 });
  assert.throws(() => taxService.rateFor('DE'), TaxServiceTimeoutError);
});

test('retried rates ask again after a timeout', () => {
  const slow = new SlowOnce();
  assert.equal(new RetriedRates(slow, 2).rateFor('DE'), 19);
  assert.equal(slow.lookups, 2);
});

test('retried rates give up after their tries', () => {
  const taxService = new TaxService({ timeoutMilliseconds: 10 });
  assert.throws(
    () => new RetriedRates(taxService, 2).rateFor('DE'),
    TaxServiceTimeoutError,
  );
  assert.equal(taxService.lookups, 2);
});

test('a missing rate is not asked again', () => {
  const taxService = new TaxService();
  assert.throws(
    () => new RetriedRates(taxService, 2).rateFor('US'),
    TaxServiceError,
  );
  assert.equal(taxService.lookups, 1);
});
