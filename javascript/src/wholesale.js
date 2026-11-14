// The wholesaler's range on the shop's pages, twenty to a page.

import { take } from './cursors.js';

// The products the wholesaler sells, as the shop shows them.
export class WholesaleCatalog {
  #wholesaler;

  constructor(wholesaler) {
    this.#wholesaler = wholesaler;
  }

  // Every product the wholesaler sells, a hundred per request.
  async allProducts() {
    const products = [];
    let rows = await this.#wholesaler.productsAfter(undefined);
    while (rows.length > 0) {
      products.push(...rows);
      rows = await this.#wholesaler.productsAfter(rows.at(-1).sku);
    }
    return products;
  }

  // The `size` products after the SKU `after`, the last one the shopper
  // saw (the More link carries it), or the first page without one.
  async page(size, after) {
    const cursor = (await this.allProducts()).values();
    if (after !== undefined) {
      let step = cursor.next();
      while (!step.done && step.value.sku !== after) step = cursor.next();
    }
    return take(cursor, size);
  }
}
