import assert from 'node:assert/strict';
import { test } from 'node:test';

import { SwiftShip, SwiftShipError } from '../src/vendor/swiftship.ts';

test('prices every started 100 grams', () => {
  // 820 g is nine started 100 g steps.
  assert.equal(new SwiftShip().quote({ grams: 820, to: 'FR' }), 630);
});

test('a light parcel pays the minimum', () => {
  assert.equal(new SwiftShip().quote({ grams: 120, to: 'DE' }), 390);
});

test('an unsupported country is an error', () => {
  assert.throws(
    () => new SwiftShip().quote({ grams: 500, to: 'US' }),
    SwiftShipError,
  );
});
