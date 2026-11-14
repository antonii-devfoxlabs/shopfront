import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Wholesaler } from '../src/vendor/wholesaler.ts';
import { WholesaleCatalog } from '../src/wholesale.ts';

function skus(first: number, last: number): string[] {
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

test('the first wholesale page sends one request', async () => {
  const wholesaler = new Wholesaler(50_000);
  await new WholesaleCatalog(wholesaler).page(20);
  assert.equal(wholesaler.requests, 1);
});

test('a for await loop walks every wholesale product', async () => {
  const walked: string[] = [];
  for await (const product of new WholesaleCatalog(new Wholesaler(250))) {
    walked.push(product.sku);
  }
  assert.deepEqual(walked, skus(1, 250));
});

test('a late wholesale page sends one request', async () => {
  const wholesaler = new Wholesaler(50_000);
  const page = await new WholesaleCatalog(wholesaler).page(20, 'W-40000');
  assert.deepEqual(
    page.map((product) => product.sku),
    skus(40_001, 40_020),
  );
  assert.equal(wholesaler.requests, 1);
});

test('the more link still works once its product is gone', async () => {
  const wholesaler = new Wholesaler(250);
  wholesaler.stopSelling('W-00020');
  const page = await new WholesaleCatalog(wholesaler).page(20, 'W-00020');
  assert.equal(page[0]?.sku, 'W-00021');
});

test('the teas box holds the first teas under the price in one request', async () => {
  const wholesaler = new Wholesaler(50_000);
  const lines = await new WholesaleCatalog(wholesaler).teas(1_000, 20);
  assert.equal(lines.length, 20);
  assert.equal(lines[0], 'W-00002  Green tea, 100 g');
  assert.equal(lines.at(-1), 'W-00097  Green tea, 100 g');
  assert.equal(wholesaler.requests, 1);
});
