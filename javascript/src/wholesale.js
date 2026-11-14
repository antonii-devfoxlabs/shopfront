// The wholesaler's range on the shop's pages, twenty to a page.

import { takeAsync } from './cursors.js';

// The products the wholesaler sells, as the shop shows them.
export class WholesaleCatalog {
  #wholesaler;

  constructor(wholesaler) {
    this.#wholesaler = wholesaler;
  }

  // A new walk over the wholesaler's products after the SKU `after`, or
  // from the first without one. It asks for the next hundred only once
  // it has handed over the last.
  async *cursor(after) {
    let rows = await this.#wholesaler.productsAfter(after);
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
    return takeAsync(this.cursor(after), size);
  }

  // The box "Teas under 10 euros": the first `count` teas cheaper than
  // `under` cents, one line each.
  async teas(under, count) {
    const cursor = this.cursor();
    const lines = [];
    while (lines.length < count) {
      const step = await cursor.next();
      if (step.done) break;
      const product = step.value;
      const name = product.name.toLowerCase();
      if (name.includes('tea') && product.priceCents < under) {
        lines.push(`${product.sku}  ${product.name}`);
      }
    }
    return lines;
  }
}
