import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  OutOfStockError,
  UnknownProductError,
  starterCatalog,
} from '../src/catalog.js';

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

test('search finds names whatever the case', () => {
  const found = starterCatalog().search('CUP');
  assert.deepEqual(
    found.map((product) => product.sku),
    ['CUP-04'],
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
