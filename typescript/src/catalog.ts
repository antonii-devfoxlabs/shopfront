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

export class Catalog {
  readonly #products: Map<string, Product>;

  constructor(products: Product[]) {
    this.#products = new Map(
      products.map((product) => [product.sku, product]),
    );
  }

  allProducts(): Product[] {
    return [...this.#products.values()];
  }

  find(sku: string): Product {
    const product = this.#products.get(sku);
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

  // Take every line, or none of them if one is short.
  takeAllFromStock(lines: ReadonlyMap<string, number>): void {
    for (const [sku, quantity] of lines) {
      const product = this.find(sku);
      if (product.stock < quantity) {
        throw new OutOfStockError(
          `${sku}: ${quantity} wanted, ${product.stock} left`,
        );
      }
    }
    for (const [sku, quantity] of lines) {
      this.takeFromStock(sku, quantity);
    }
  }

  search(text: string): Product[] {
    const wanted = text.toLowerCase();
    return this.allProducts().filter((product) =>
      product.name.toLowerCase().includes(wanted),
    );
  }
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
