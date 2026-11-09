import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DUTCH_SHOP, GERMAN_SHOP } from '../src/settings.js';

// Nothing checks the Settings typedef, so this test does: a shop that
// left a setting out would run with it undefined.
test('every shop names every setting', () => {
  assert.deepEqual(
    Object.keys(DUTCH_SHOP).sort(),
    Object.keys(GERMAN_SHOP).sort(),
  );
});
