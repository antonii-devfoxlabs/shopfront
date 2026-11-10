// The catalog file the owner edits: the one module that reads it.

import { readFileSync } from 'node:fs';

import { Catalog } from './catalog.js';

// Read the owner's catalog file into a Catalog.
export function loadCatalog(path) {
  const rows = JSON.parse(readFileSync(path, 'utf8'));
  return new Catalog(rows.map((row) => product(row)));
}

// One row of the file, in the file's words, as a product.
function product(row) {
  return {
    sku: row.sku,
    name: row.name,
    priceCents: row.price_cents,
    weightGrams: row.weight_grams,
    stock: row.stock,
  };
}
