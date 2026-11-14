import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';

import { CatalogError, loadCatalog } from '../src/catalogFile.js';

const KETTLE = {
  sku: 'KTL-03',
  name: 'Pour-over kettle',
  price_cents: 4900,
  weight_grams: 1100,
  stock: 8,
};

// Each test gets a new, empty folder, deleted after the test, whether
// it passed or failed.
let folder;

beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), 'shopfront-'));
});

afterEach(() => {
  rmSync(folder, { recursive: true });
});

// A path to catalog.json in this test's folder.
function freshPath() {
  return join(folder, 'catalog.json');
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

test('true or false is not a whole number', () => {
  const path = freshPath();
  writeFileSync(path, JSON.stringify([{ ...KETTLE, stock: true }]));
  assert.throws(() => loadCatalog(path), {
    name: 'CatalogError',
    message: /catalog\.json, product 1: stock must be a whole number$/,
  });
});
