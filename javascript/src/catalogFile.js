// The catalog file the owner edits: the one module that reads it.

import { readFileSync } from 'node:fs';

import { Catalog } from './catalog.js';

// The owner's catalog file cannot be read: the message says where.
export class CatalogFileError extends Error {
  name = 'CatalogFileError';
}

// Read the owner's catalog file into a Catalog, or say what is wrong
// with it.
export function loadCatalog(path) {
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new CatalogFileError(`${path}: no such file`, { cause: error });
    }
    throw error;
  }
  let rows;
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

// One row of the file, in the file's words, as a product.
function product(row, where) {
  if (typeof row !== 'object' || row === null) {
    throw new CatalogFileError(`${where}: not a product`);
  }
  return {
    sku: text(row, 'sku', where),
    name: text(row, 'name', where),
    priceCents: wholeNumber(row, 'price_cents', where),
    weightGrams: wholeNumber(row, 'weight_grams', where),
    stock: wholeNumber(row, 'stock', where),
  };
}

function text(row, field, where) {
  const value = row[field];
  if (typeof value !== 'string') {
    throw new CatalogFileError(`${where}: ${field} must be text`);
  }
  return value;
}

function wholeNumber(row, field, where) {
  const value = row[field];
  if (!Number.isInteger(value)) {
    throw new CatalogFileError(`${where}: ${field} must be a whole number`);
  }
  return value;
}
