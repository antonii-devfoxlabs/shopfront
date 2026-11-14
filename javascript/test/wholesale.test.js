import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Wholesaler } from '../src/vendor/wholesaler.js';
import { WholesaleCatalog } from '../src/wholesale.js';

function skus(first, last) {
  return Array.from(
    { length: last - first + 1 },
    (_, index) => `W-${String(first + index).padStart(5, '0')}`,
  );
}

test('a wholesale page holds the products after the sku in its link', async () => {
  const catalog = new WholesaleCatalog(new Wholesaler(250));
  const first = await catalog.page(20);
  const later = await catalog.page(20, 'W-00120');
  assert.deepEqual(
    first.map((product) => product.sku),
    skus(1, 20),
  );
  assert.deepEqual(
    later.map((product) => product.sku),
    skus(121, 140),
  );
});
