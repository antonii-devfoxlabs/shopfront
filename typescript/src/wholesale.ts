// The wholesaler's range on the shop's pages, twenty to a page.

import type { Product } from './catalog.ts';
import { take } from './cursors.ts';
import type { Wholesaler } from './vendor/wholesaler.ts';

// The products the wholesaler sells, as the shop shows them.
export class WholesaleCatalog {
  readonly #wholesaler: Wholesaler;

  constructor(wholesaler: Wholesaler) {
    this.#wholesaler = wholesaler;
  }

  // Every product the wholesaler sells, a hundred per request.
  async allProducts(): Promise<Product[]> {
    const products: Product[] = [];
    let rows = await this.#wholesaler.productsAfter(undefined);
    let last = rows.at(-1);
    while (last !== undefined) {
      products.push(...rows);
      rows = await this.#wholesaler.productsAfter(last.sku);
      last = rows.at(-1);
    }
    return products;
  }

  // The `size` products after the SKU `after`, the last one the shopper
  // saw (the More link carries it), or the first page without one.
  async page(size: number, after?: string): Promise<Product[]> {
    const cursor = (await this.allProducts()).values();
    if (after !== undefined) {
      let step = cursor.next();
      while (!step.done && step.value.sku !== after) step = cursor.next();
    }
    return take(cursor, size);
  }
}
