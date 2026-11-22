import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatMoney } from '../src/money.ts';
import { GERMAN_SHOP } from '../src/settings.ts';

test('money is shown in euros', () => {
  assert.equal(formatMoney(3_168, GERMAN_SHOP), '31.68 EUR');
  assert.equal(formatMoney(5, GERMAN_SHOP), '0.05 EUR');
  assert.equal(formatMoney(-205, GERMAN_SHOP), '-2.05 EUR');
});

test('thousands are set apart with commas', () => {
  assert.equal(formatMoney(125_000, GERMAN_SHOP), '1,250.00 EUR');
  assert.equal(formatMoney(-123_456_789, GERMAN_SHOP), '-1,234,567.89 EUR');
});
