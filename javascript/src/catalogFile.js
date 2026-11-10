// The catalog file the owner edits: the one module that reads it.

import { readFileSync } from 'node:fs';

import { Catalog } from './catalog.js';

// The catalog cannot be read: the message says where, and why.
export class CatalogError extends Error {
  name = 'CatalogError';
}

// Read the owner's catalog file into a Catalog, or say what is wrong
// with it.
export function loadCatalog(path) {
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new CatalogError(`${path}: no such file`, { cause: error });
    }
    throw error;
  }
  let rows;
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
function catalogFrom(rows, where) {
  if (!Array.isArray(rows)) {
    throw new CatalogError(`${where}: not a list of products`);
  }
  return new Catalog(
    rows.map((row, index) => product(row, `${where}, product ${index + 1}`)),
  );
}

// One row of the file, in the file's words, as a product.
function product(row, where) {
  if (typeof row !== 'object' || row === null) {
    throw new CatalogError(`${where}: not a product`);
  }
  return {
    sku: textField(row, 'sku', where),
    name: textField(row, 'name', where),
    priceCents: wholeNumberField(row, 'price_cents', where),
    weightGrams: wholeNumberField(row, 'weight_grams', where),
    stock: wholeNumberField(row, 'stock', where),
  };
}

function textField(row, field, where) {
  const value = row[field];
  if (typeof value !== 'string') {
    throw new CatalogError(`${where}: ${field} must be text`);
  }
  return value;
}

function wholeNumberField(row, field, where) {
  const value = row[field];
  if (!Number.isInteger(value)) {
    throw new CatalogError(`${where}: ${field} must be a whole number`);
  }
  return value;
}
