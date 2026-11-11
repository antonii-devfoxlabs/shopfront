import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  OutOfStockError,
  UnknownProductError,
  starterCatalog,
} from '../src/catalog.ts';
import { loadCatalog } from '../src/catalogFile.ts';

test('finds a product by its sku', () => {
  assert.equal(starterCatalog().find('MUG-01').name, 'Enamel mug');
});

test('an unknown sku is an error', () => {
  assert.throws(() => starterCatalog().find('NOPE-99'), UnknownProductError);
});

test('taking from stock lowers it', () => {
  const catalog = starterCatalog();
  catalog.takeFromStock('KTL-03', 3);
  assert.equal(catalog.find('KTL-03').stock, 5);
});

test('cannot take more than is left', () => {
  assert.throws(() => starterCatalog().takeFromStock('KTL-03', 9), {
    constructor: OutOfStockError,
    message: 'KTL-03: 9 wanted, 8 left',
  });
});

test('lists every product', () => {
  assert.equal(starterCatalog().allProducts().length, 5);
});

test('a cursor hands over every product in order', () => {
  const cursor = starterCatalog().cursor();
  const skus: string[] = [];
  let product = cursor.next();
  while (product !== undefined) {
    skus.push(product.sku);
    product = cursor.next();
  }
  assert.deepEqual(skus, ['MUG-01', 'TEA-02', 'KTL-03', 'CUP-04', 'FLT-05']);
  assert.equal(cursor.next(), undefined);
});

test('each cursor keeps its own place', () => {
  const catalog = starterCatalog();
  const first = catalog.cursor();
  first.next();
  first.next();
  const second = catalog.cursor();
  assert.equal(second.next(), catalog.find('MUG-01'));
  assert.equal(first.next(), catalog.find('KTL-03'));
});

test('a page holds the products in catalog order', () => {
  const catalog = starterCatalog();
  assert.deepEqual(
    catalog.page(1, 2).map((product) => product.sku),
    ['MUG-01', 'TEA-02'],
  );
  assert.deepEqual(
    catalog.page(3, 2).map((product) => product.sku),
    ['FLT-05'],
  );
  assert.deepEqual(catalog.page(4, 2), []);
});

test('search finds names whatever the case', () => {
  const found = starterCatalog().search('CUP', 20);
  assert.deepEqual(
    found.map((product) => product.sku),
    ['CUP-04'],
  );
});

test('search shows no more than its limit', () => {
  const found = starterCatalog().search('E', 2);
  assert.deepEqual(
    found.map((product) => product.sku),
    ['MUG-01', 'TEA-02'],
  );
});

test('taking several lines takes none if one is short', () => {
  const catalog = starterCatalog();
  assert.throws(
    () =>
      catalog.takeAllFromStock(
        new Map([
          ['MUG-01', 2],
          ['KTL-03', 9],
        ]),
      ),
    OutOfStockError,
  );
  assert.equal(catalog.find('MUG-01').stock, 40);
});

test('checking the stock takes nothing', () => {
  const catalog = starterCatalog();
  catalog.checkStock(new Map([['MUG-01', 40]]));
  assert.throws(
    () =>
      catalog.checkStock(
        new Map([
          ['MUG-01', 2],
          ['KTL-03', 9],
        ]),
      ),
    OutOfStockError,
  );
  assert.equal(catalog.find('MUG-01').stock, 40);
});

test("the shop's catalog file holds what it sells", () => {
  const catalog = loadCatalog('catalog.json');
  assert.deepEqual(catalog.allProducts(), starterCatalog().allProducts());
});
