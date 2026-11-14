// What the cart page's buttons call, and its Undo of the last edit.

import { AddLine, ChangeQuantity, EmptyCart, RemoveLine } from './edits.js';

/** @typedef {import('./edits.js').Edit} Edit */

export class NothingToUndoError extends Error {
  name = 'NothingToUndoError';
}

export class CartPage {
  // The message under the buttons, with its Undo link.
  message = '';
  /** @type {Edit | undefined} */
  #last = undefined;

  constructor(cart) {
    this.cart = cart;
  }

  plus(sku) {
    const addition = new AddLine(this.cart, sku);
    addition.run();
    this.#last = addition;
    this.message = addition.label();
  }

  minus(sku) {
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

  setQuantity(sku, quantity) {
    const change = new ChangeQuantity(this.cart, sku, quantity);
    change.run();
    this.#last = change;
    this.message = change.label();
  }

  remove(sku) {
    const removal = new RemoveLine(this.cart, sku);
    removal.run();
    this.#last = removal;
    this.message = removal.label();
  }

  empty() {
    const emptying = new EmptyCart(this.cart);
    emptying.run();
    this.message = emptying.label();
  }

  undo() {
    if (this.#last === undefined) throw new NothingToUndoError();
    this.#last.undo();
    this.#last = undefined;
    this.message = '';
  }
}
