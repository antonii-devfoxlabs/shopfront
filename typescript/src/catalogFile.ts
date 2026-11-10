// The catalog file the owner edits: the one module that reads it.

import { readFileSync } from 'node:fs';

import { Catalog, type Product } from './catalog.ts';

// The catalog cannot be read: the message says where, and why.
export class CatalogError extends Error {
  override name = 'CatalogError';
}

// One row of the file, in the file's words: anything JSON can hold,
// until it is checked.
type CatalogRow = Record<string, unknown>;

// Read the owner's catalog file into a Catalog, or say what is wrong
// with it.
export function loadCatalog(path: string): Catalog {
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      throw new CatalogError(`${path}: no such file`, { cause: error });
    }
    throw error;
  }
  let rows: unknown;
  try {
    rows = JSON.parse(text);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new CatalogError(`${path}: ${error.message}`, {
        cause: error,
      });
    }
    throw error;
  }
  return catalogFrom(rows, path);
}

// The rows, wherever they were read from, checked into a Catalog.
function catalogFrom(rows: unknown, where: string): Catalog {
  if (!Array.isArray(rows)) {
    throw new CatalogError(`${where}: not a list of products`);
  }
  return new Catalog(
    rows.map((row, index) => product(row, `${where}, product ${index + 1}`)),
  );
}

// One row of the file, as a product.
function product(row: unknown, where: string): Product {
  if (typeof row !== 'object' || row === null) {
    throw new CatalogError(`${where}: not a product`);
  }
  const fields = row as CatalogRow;
  return {
    sku: textField(fields, 'sku', where),
    name: textField(fields, 'name', where),
    priceCents: wholeNumberField(fields, 'price_cents', where),
    weightGrams: wholeNumberField(fields, 'weight_grams', where),
    stock: wholeNumberField(fields, 'stock', where),
  };
}

function textField(row: CatalogRow, field: string, where: string): string {
  const value = row[field];
  if (typeof value !== 'string') {
    throw new CatalogError(`${where}: ${field} must be text`);
  }
  return value;
}

function wholeNumberField(
  row: CatalogRow,
  field: string,
  where: string,
): number {
  const value = row[field];
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new CatalogError(`${where}: ${field} must be a whole number`);
  }
  return value;
}
