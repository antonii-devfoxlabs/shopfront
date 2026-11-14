// The wholesaler's range on the shop's pages, twenty to a page.

import { takeAsync } from './cursors.js';

// The products the wholesaler sells, as the shop shows them.
export class WholesaleCatalog {
  #wholesaler;

  constructor(wholesaler) {
    this.#wholesaler = wholesaler;
  }

  // A new walk over the wholesaler's products, from the first. It asks
  // for the next hundred only once it has handed over the last.
  async *cursor() {
    let rows = await this.#wholesaler.productsAfter(undefined);
    while (rows.length > 0) {
      yield* rows;
      rows = await this.#wholesaler.productsAfter(rows.at(-1).sku);
    }
  }

  // What a for await...of loop asks for: a new cursor, from the first.
  [Symbol.asyncIterator]() {
    return this.cursor();
  }

  // The `size` products after the SKU `after`, the last one the shopper
  // saw (the More link carries it), or the first page without one.
  async page(size, after) {
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
