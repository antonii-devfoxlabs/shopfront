// What the cart page's buttons call, and its Undo of the last edit.

import type { Cart } from './cart.ts';
import { AddLine, ChangeQuantity, EmptyCart, RemoveLine } from './edits.ts';

export class NothingToUndoError extends Error {
  override name = 'NothingToUndoError';
}

export class CartPage {
  // The message under the buttons, with its Undo link.
  message = '';
  #last: AddLine | ChangeQuantity | RemoveLine | EmptyCart | undefined =
    undefined;
  readonly cart: Cart;

  constructor(cart: Cart) {
    this.cart = cart;
  }

  plus(sku: string): void {
    const addition = new AddLine(this.cart, sku);
    addition.run();
    this.#last = addition;
    this.message = `Added ${sku}`;
  }

  minus(sku: string): void {
    const quantity = this.cart.lines.get(sku) ?? 0;
    if (quantity === 1) {
      const removal = new RemoveLine(this.cart, sku);
      removal.run();
      this.#last = removal;
      this.message = `Removed ${sku}`;
    } else {
      const change = new ChangeQuantity(this.cart, sku, quantity - 1);
      change.run();
      this.#last = change;
      this.message = `${sku} set to ${quantity - 1}`;
    }
  }

  setQuantity(sku: string, quantity: number): void {
    const change = new ChangeQuantity(this.cart, sku, quantity);
    change.run();
    this.#last = change;
    if (quantity < 1) this.message = `Removed ${sku}`;
    else this.message = `${sku} set to ${quantity}`;
  }

  remove(sku: string): void {
    const removal = new RemoveLine(this.cart, sku);
    removal.run();
    this.#last = removal;
    this.message = `Removed ${sku}`;
  }

  empty(): void {
    const emptying = new EmptyCart(this.cart);
    emptying.run();
    this.message = 'Emptied the cart';
  }

  undo(): void {
    if (this.#last === undefined) throw new NothingToUndoError();
    this.#last.undo();
    this.#last = undefined;
    this.message = '';
  }
}
