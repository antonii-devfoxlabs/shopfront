// What a shopper asks the cart page to do, kept so it can be undone.

import type { Cart } from './cart.ts';

// Takes one line out of the cart, and can put it back.
export class RemoveLine {
  readonly #cart: Cart;
  readonly #sku: string;
  #quantity = 0;

  constructor(cart: Cart, sku: string) {
    this.#cart = cart;
    this.#sku = sku;
  }

  run(): void {
    // Read the quantity before the line goes: undo needs it.
    this.#quantity = this.#cart.lines.get(this.#sku) ?? 0;
    this.#cart.remove(this.#sku);
  }

  undo(): void {
    this.#cart.add(this.#sku, this.#quantity);
  }
}
