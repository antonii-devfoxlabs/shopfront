import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { CatalogError, loadCatalog } from '../src/catalogFile.js';

const KETTLE = {
  sku: 'KTL-03',
  name: 'Pour-over kettle',
  price_cents: 4900,
  weight_grams: 1100,
  stock: 8,
};

// A path to catalog.json in a new, empty folder.
function freshPath() {
  return join(mkdtempSync(join(tmpdir(), 'shopfront-')), 'catalog.json');
}

test('a typo in a field names the file and the product', () => {
  const path = freshPath();
  const typo = {
    sku: 'MUG-01',
    name: 'Enamel mug',
    price_cent: 1250,
    weight_grams: 350,
    stock: 40,
  };
  writeFileSync(path, JSON.stringify([KETTLE, typo]));
  assert.throws(() => loadCatalog(path), {
    name: 'CatalogError',
    message: /catalog\.json, product 2: price_cents must be a whole number$/,
  });
});

test('broken JSON names the file and the line', () => {
  const path = freshPath();
  writeFileSync(path, '[\n  {"sku": "KTL-03"\n  "name": "Kettle"}\n]\n');
  assert.throws(() => loadCatalog(path), {
    name: 'CatalogError',
    message: /catalog\.json: .*\(line 3 column 3\)$/,
  });
});

test("a missing file is said in the store's words", () => {
  assert.throws(() => loadCatalog(freshPath()), {
    name: 'CatalogError',
    message: /catalog\.json: no such file$/,
  });
});
