// What a shopper asks the cart page to do, kept so it can be undone.

import type { Cart } from './cart.ts';

// Adds to a line, and can take the addition back.
export class AddLine {
  readonly #cart: Cart;
  readonly #sku: string;
  readonly #quantity: number;
  #before = 0;

  constructor(cart: Cart, sku: string, quantity = 1) {
    this.#cart = cart;
    this.#sku = sku;
    this.#quantity = quantity;
  }

  run(): void {
    // Read what the line held before the add: undo needs it.
    this.#before = this.#cart.lines.get(this.#sku) ?? 0;
    this.#cart.add(this.#sku, this.#quantity);
  }

  undo(): void {
    if (this.#before === 0) this.#cart.remove(this.#sku);
    else this.#cart.changeQuantity(this.#sku, this.#before);
  }
}

// Sets a line's quantity, and can set it back.
export class ChangeQuantity {
  readonly #cart: Cart;
  readonly #sku: string;
  readonly #quantity: number;
  #before = 0;

  constructor(cart: Cart, sku: string, quantity: number) {
    this.#cart = cart;
    this.#sku = sku;
    this.#quantity = quantity;
  }

  run(): void {
    // Read the quantity before it changes: undo needs it.
    this.#before = this.#cart.lines.get(this.#sku) ?? 0;
    this.#cart.changeQuantity(this.#sku, this.#quantity);
  }

  undo(): void {
    // A change to zero took the line away: add it back.
    if (this.#quantity < 1) this.#cart.add(this.#sku, this.#before);
    else this.#cart.changeQuantity(this.#sku, this.#before);
  }
}

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

// Takes every line out of the cart, and can put them all back.
export class EmptyCart {
  readonly #cart: Cart;
  #lines = new Map<string, number>();

  constructor(cart: Cart) {
    this.#cart = cart;
  }

  run(): void {
    // A copy, made before the lines go: undo needs every one.
    this.#lines = new Map(this.#cart.lines);
    for (const sku of this.#lines.keys()) this.#cart.remove(sku);
  }

  undo(): void {
    for (const [sku, quantity] of this.#lines) {
      this.#cart.add(sku, quantity);
    }
  }
}
