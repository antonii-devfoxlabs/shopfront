// What the cart page's buttons call, and its Undo of the last edit.

import type { Cart } from './cart.ts';
import {
  AddLine,
  ChangeQuantity,
  EmptyCart,
  RemoveLine,
  type Edit,
} from './edits.ts';

export class NothingToUndoError extends Error {
  override name = 'NothingToUndoError';
}

export class CartPage {
  // The message under the buttons, with its Undo link.
  message = '';
  #last: Edit | undefined = undefined;
  readonly cart: Cart;

  constructor(cart: Cart) {
    this.cart = cart;
  }

  plus(sku: string): void {
    const addition = new AddLine(this.cart, sku);
    addition.run();
    this.#last = addition;
    this.message = addition.label();
  }

  minus(sku: string): void {
    const quantity = this.cart.lines.get(sku) ?? 0;
    if (quantity === 1) {
      const removal = new RemoveLine(this.cart, sku);
      removal.run();
      this.#last = removal;
      this.message = removal.label();
    } else {
      const change = new ChangeQuantity(this.cart, sku, quantity - 1);
      change.run();
      this.#last = change;
      this.message = change.label();
    }
  }

  setQuantity(sku: string, quantity: number): void {
    const change = new ChangeQuantity(this.cart, sku, quantity);
    change.run();
    this.#last = change;
    this.message = change.label();
  }

  remove(sku: string): void {
    const removal = new RemoveLine(this.cart, sku);
    removal.run();
    this.#last = removal;
    this.message = removal.label();
  }

  empty(): void {
    const emptying = new EmptyCart(this.cart);
    emptying.run();
    this.message = emptying.label();
  }

  undo(): void {
    if (this.#last === undefined) throw new NothingToUndoError();
    this.#last.undo();
    this.#last = undefined;
    this.message = '';
  }
}
