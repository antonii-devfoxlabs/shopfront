// The products Shopfront sells, and how many of each are left.

export type Product = {
  readonly sku: string;
  readonly name: string;
  readonly priceCents: number;
  readonly weightGrams: number;
  stock: number;
};

export class UnknownProductError extends Error {
  override name = 'UnknownProductError';
}

export class OutOfStockError extends Error {
  override name = 'OutOfStockError';
}

// Hands over the catalog's products one at a time, in order. It keeps
// its own place, so each walk has a cursor of its own.
export class ProductCursor {
  readonly #products: readonly Product[];
  #place = 0;

  constructor(products: readonly Product[]) {
    this.#products = products;
  }

  // The next product, or undefined once every one is handed over.
  next(): Product | undefined {
    if (this.#place === this.#products.length) return undefined;
    const product = this.#products[this.#place];
    this.#place += 1;
    return product;
  }
}

export class Catalog {
  readonly #products: Product[];
  readonly #bySku: Map<string, Product>;

  constructor(products: Product[]) {
    this.#products = [...products];
    this.#bySku = new Map(products.map((product) => [product.sku, product]));
  }

  allProducts(): Product[] {
    return [...this.#products];
  }

  // A new walk over every product, from the first.
  cursor(): ProductCursor {
    return new ProductCursor(this.#products);
  }

  find(sku: string): Product {
    const product = this.#bySku.get(sku);
    if (product === undefined) throw new UnknownProductError(sku);
    return product;
  }

  takeFromStock(sku: string, quantity: number): void {
    const product = this.find(sku);
    if (product.stock < quantity) {
      throw new OutOfStockError(
        `${sku}: ${quantity} wanted, ${product.stock} left`,
      );
    }
    product.stock -= quantity;
  }

  // Throw if any line is short; take nothing.
  checkStock(lines: ReadonlyMap<string, number>): void {
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
  takeAllFromStock(lines: ReadonlyMap<string, number>): void {
    this.checkStock(lines);
    for (const [sku, quantity] of lines) {
      this.takeFromStock(sku, quantity);
    }
  }

  // The first `limit` products whose names hold `text`, any case.
  search(text: string, limit: number): Product[] {
    const wanted = text.toLowerCase();
    const found: Product[] = [];
    const cursor = this.cursor();
    while (found.length < limit) {
      const product = cursor.next();
      if (product === undefined) break;
      if (product.name.toLowerCase().includes(wanted)) found.push(product);
    }
    return found;
  }
}

// The next `count` products from the cursor, or fewer at the end.
export function take(cursor: ProductCursor, count: number): Product[] {
  const taken: Product[] = [];
  while (taken.length < count) {
    const product = cursor.next();
    if (product === undefined) break;
    taken.push(product);
  }
  return taken;
}

export function starterCatalog(): Catalog {
  return new Catalog([
    product('MUG-01', 'Enamel mug', 1_250, 350, 40),
    product('TEA-02', 'Green tea, 100 g', 890, 120, 120),
    product('KTL-03', 'Pour-over kettle', 4_900, 1_100, 8),
    product('CUP-04', 'Glass cup, set of two', 2_400, 600, 25),
    product('FLT-05', 'Paper filters, 100', 450, 90, 200),
  ]);
}

function product(
  sku: string,
  name: string,
  priceCents: number,
  weightGrams: number,
  stock: number,
): Product {
  return { sku, name, priceCents, weightGrams, stock };
}
