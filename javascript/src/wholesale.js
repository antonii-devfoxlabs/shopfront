// The wholesaler's range on the shop's pages, twenty to a page.

import { filterAsync, mapAsync, takeAsync } from './cursors.js';

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
    return Array.fromAsync(takeAsync(this.cursor(after), size));
  }

  // The box "Teas under 10 euros": the first `count` teas cheaper than
  // `under` cents, one line each.
  async teas(under, count) {
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
