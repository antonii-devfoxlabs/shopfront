import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatMoney } from '../src/orders.js';
import { boxRouteQuote } from '../src/providers.js';
import { GERMAN_SHOP } from '../src/settings.js';
import { NoShippingError } from '../src/shipping.js';
import { timed } from '../src/timing.js';

test('a timed function gives the same answer', () => {
  const quote = timed('boxroute quote', boxRouteQuote, () => {});
  assert.equal(quote(2_500, 'PL'), 650);
});

test('a timed function logs each call and its time', () => {
  const lines = [];
  const quote = timed('boxroute quote', boxRouteQuote, (line) =>
    lines.push(line),
  );
  quote(2_500, 'PL');
  quote(700, 'PL');
  assert.equal(lines.length, 2);
  assert.match(lines[0] ?? '', /^boxroute quote in \d+ ms$/);
  assert.match(lines[1] ?? '', /^boxroute quote in \d+ ms$/);
});

test('wrapping a function calls nothing yet', () => {
  const asked = [];
  const lines = [];
  const quote = (grams, country) => {
    asked.push(country);
    return 700;
  };
  const timedQuote = timed('a quote', quote, (line) => lines.push(line));
  assert.deepEqual(asked, []);
  assert.deepEqual(lines, []);
  assert.equal(timedQuote(700, 'DE'), 700);
  assert.deepEqual(asked, ['DE']);
});

test('a refusal still reaches the caller', () => {
  const lines = [];
  const quote = timed('boxroute quote', boxRouteQuote, (line) =>
    lines.push(line),
  );
  assert.throws(() => quote(700, 'ES'), NoShippingError);
  assert.deepEqual(lines, []);
});

test('any function can be timed', () => {
  const lines = [];
  const money = timed('format money', formatMoney, (line) =>
    lines.push(line),
  );
  assert.equal(money(4_121, GERMAN_SHOP), '41.21 EUR');
  assert.match(lines[0] ?? '', /^format money in \d+ ms$/);
});
