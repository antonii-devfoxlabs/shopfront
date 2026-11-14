// The products Shopfront sells, and how many of each are left.

export class UnknownProductError extends Error {
  name = 'UnknownProductError';
}

export class OutOfStockError extends Error {
  name = 'OutOfStockError';
}

export class Catalog {
  #products;
  #bySku;

  constructor(products) {
    this.#products = [...products];
    this.#bySku = new Map(products.map((product) => [product.sku, product]));
  }

  // A new walk over every product, from the first.
  *cursor() {
    yield* this.#products;
  }

  // What a for...of loop asks for: a new cursor, from the first.
  [Symbol.iterator]() {
    return this.cursor();
  }

  find(sku) {
    const product = this.#bySku.get(sku);
    if (product === undefined) throw new UnknownProductError(sku);
    return product;
  }

  takeFromStock(sku, quantity) {
    const product = this.find(sku);
    if (product.stock < quantity) {
      throw new OutOfStockError(
        `${sku}: ${quantity} wanted, ${product.stock} left`,
      );
    }
    product.stock -= quantity;
  }

  // Throw if any line is short; take nothing.
  checkStock(lines) {
    for (const [sku, quantity] of lines) {
      const product = this.find(sku);
      if (product.stock < quantity) {
        throw new OutOfStockError(
          `${sku}: ${quantity} wanted, ${product.stock} left`,
        );
      }
    }
  }

  // Take every line, or none of them if one is short.
  takeAllFromStock(lines) {
    this.checkStock(lines);
    for (const [sku, quantity] of lines) {
      this.takeFromStock(sku, quantity);
    }
  }

  // The first `limit` products whose names hold `text`, any case.
  search(text, limit) {
    const wanted = text.toLowerCase();
    return this.cursor()
      .filter((product) => product.name.toLowerCase().includes(wanted))
      .take(limit)
      .toArray();
  }
}

// Every product with fewer than `under` left, for the weekly order.
export function reorderList(catalog, under) {
  return catalog
    .cursor()
    .filter((product) => product.stock < under)
    .toArray();
}

export function starterCatalog() {
  return new Catalog([
    product('MUG-01', 'Enamel mug', 1_250, 350, 40),
    product('TEA-02', 'Green tea, 100 g', 890, 120, 120),
    product('KTL-03', 'Pour-over kettle', 4_900, 1_100, 8),
    product('CUP-04', 'Glass cup, set of two', 2_400, 600, 25),
    product('FLT-05', 'Paper filters, 100', 450, 90, 200),
  ]);
}

function product(sku, name, priceCents, weightGrams, stock) {
  return { sku, name, priceCents, weightGrams, stock };
}
