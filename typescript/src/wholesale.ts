// The wholesaler's range on the shop's pages, twenty to a page.

import type { Product } from './catalog.ts';
import { filterAsync, mapAsync, takeAsync } from './cursors.ts';
import type { Wholesaler } from './vendor/wholesaler.ts';

// The products the wholesaler sells, as the shop shows them.
export class WholesaleCatalog {
  readonly #wholesaler: Wholesaler;

  constructor(wholesaler: Wholesaler) {
    this.#wholesaler = wholesaler;
  }

  // A new walk over the wholesaler's products after the SKU `after`, or
  // from the first without one. It asks for the next hundred only once
  // it has handed over the last.
  async *cursor(after?: string): AsyncGenerator<Product> {
    let rows = await this.#wholesaler.productsAfter(after);
    let last = rows.at(-1);
    while (last !== undefined) {
      yield* rows;
      rows = await this.#wholesaler.productsAfter(last.sku);
      last = rows.at(-1);
    }
  }

  // What a for await...of loop asks for: a new cursor, from the first.
  [Symbol.asyncIterator](): AsyncGenerator<Product> {
    return this.cursor();
  }

  // The `size` products after the SKU `after`, the last one the shopper
  // saw (the More link carries it), or the first page without one.
  async page(size: number, after?: string): Promise<Product[]> {
    return Array.fromAsync(takeAsync(this.cursor(after), size));
  }

  // The box "Teas under 10 euros": the first `count` teas cheaper than
  // `under` cents, one line each.
  async teas(under: number, count: number): Promise<string[]> {
    const cheapTeas = filterAsync(
      this.cursor(),
      (product) =>
        product.name.toLowerCase().includes('tea') &&
        product.priceCents < under,
    );
    const lines = mapAsync(
      cheapTeas,
      (product) => `${product.sku}  ${product.name}`,
    );
    return Array.fromAsync(takeAsync(lines, count));
  }
}
