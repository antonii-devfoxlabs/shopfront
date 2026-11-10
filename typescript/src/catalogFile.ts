// The catalog file the owner edits: the one module that reads it.

import { readFileSync } from 'node:fs';

import { Catalog, type Product } from './catalog.ts';

// One row of the file, in the file's words.
type CatalogRow = {
  sku: string;
  name: string;
  price_cents: number;
  weight_grams: number;
  stock: number;
};

// Read the owner's catalog file into a Catalog.
export function loadCatalog(path: string): Catalog {
  const rows: CatalogRow[] = JSON.parse(readFileSync(path, 'utf8'));
  return new Catalog(rows.map((row) => product(row)));
}

// One row of the file, as a product.
function product(row: CatalogRow): Product {
  return {
    sku: row.sku,
    name: row.name,
    priceCents: row.price_cents,
    weightGrams: row.weight_grams,
    stock: row.stock,
  };
}
