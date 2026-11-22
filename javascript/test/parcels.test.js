import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PARCELNOW, Parcel } from '../src/parcels.js';

test("a parcel links to its courier's page for it", () => {
  const parcel = new Parcel({ courier: PARCELNOW, number: 'PN-58213' });
  assert.equal(
    parcel.trackingLink(),
    'https://parcelnow.example/track/PN-58213',
  );
});
