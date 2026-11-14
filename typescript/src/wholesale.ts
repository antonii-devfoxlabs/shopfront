// The wholesaler's range on the shop's pages, twenty to a page.

import type { Product } from './catalog.ts';
import { takeAsync } from './cursors.ts';
import type { Wholesaler } from './vendor/wholesaler.ts';

// The products the wholesaler sells, as the shop shows them.
export class WholesaleCatalog {
  readonly #wholesaler: Wholesaler;

  constructor(wholesaler: Wholesaler) {
    this.#wholesaler = wholesaler;
  }

  // A new walk over the wholesaler's products, from the first. It asks
  // for the next hundred only once it has handed over the last.
  async *cursor(): AsyncGenerator<Product> {
    let rows = await this.#wholesaler.productsAfter(undefined);
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
    const cursor = this.cursor();
    if (after !== undefined) {
      let step = await cursor.next();
      while (!step.done && step.value.sku !== after) {
        step = await cursor.next();
      }
    }
    return takeAsync(cursor, size);
  }
}
