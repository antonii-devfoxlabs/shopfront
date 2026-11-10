// The catalog file the owner edits: the one module that reads it.

import { readFileSync } from 'node:fs';

import { Catalog, type Product } from './catalog.ts';

// The owner's catalog file cannot be read: the message says where.
export class CatalogFileError extends Error {
  override name = 'CatalogFileError';
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
      throw new CatalogFileError(`${path}: no such file`, { cause: error });
    }
    throw error;
  }
  let rows: unknown;
  try {
    rows = JSON.parse(text);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new CatalogFileError(`${path}: ${error.message}`, {
        cause: error,
      });
    }
    throw error;
  }
  if (!Array.isArray(rows)) {
    throw new CatalogFileError(`${path}: not a list of products`);
  }
  return new Catalog(
    rows.map((row, index) => product(row, `${path}, product ${index + 1}`)),
  );
}

// One row of the file, as a product.
function product(row: unknown, where: string): Product {
  if (typeof row !== 'object' || row === null) {
    throw new CatalogFileError(`${where}: not a product`);
  }
  const fields = row as CatalogRow;
  return {
    sku: text(fields, 'sku', where),
    name: text(fields, 'name', where),
    priceCents: wholeNumber(fields, 'price_cents', where),
    weightGrams: wholeNumber(fields, 'weight_grams', where),
    stock: wholeNumber(fields, 'stock', where),
  };
}

function text(row: CatalogRow, field: string, where: string): string {
  const value = row[field];
  if (typeof value !== 'string') {
    throw new CatalogFileError(`${where}: ${field} must be text`);
  }
  return value;
}

function wholeNumber(row: CatalogRow, field: string, where: string): number {
  const value = row[field];
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new CatalogFileError(`${where}: ${field} must be a whole number`);
  }
  return value;
}
