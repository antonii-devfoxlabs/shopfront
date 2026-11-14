// What the cart page's buttons call, and its Undo of the last edit.

import { AddLine, ChangeQuantity, EmptyCart, RemoveLine } from './edits.js';

export class NothingToUndoError extends Error {
  name = 'NothingToUndoError';
}

export class CartPage {
  // The message under the buttons, with its Undo link.
  message = '';
  #last = undefined;

  constructor(cart) {
    this.cart = cart;
  }

  plus(sku) {
    const addition = new AddLine(this.cart, sku);
    addition.run();
    this.#last = addition;
    this.message = `Added ${sku}`;
  }

  minus(sku) {
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

  setQuantity(sku, quantity) {
    const change = new ChangeQuantity(this.cart, sku, quantity);
    change.run();
    this.#last = change;
    if (quantity < 1) this.message = `Removed ${sku}`;
    else this.message = `${sku} set to ${quantity}`;
  }

  remove(sku) {
    const removal = new RemoveLine(this.cart, sku);
    removal.run();
    this.#last = removal;
    this.message = `Removed ${sku}`;
  }

  empty() {
    const emptying = new EmptyCart(this.cart);
    emptying.run();
    this.message = 'Emptied the cart';
  }

  undo() {
    if (this.#last === undefined) throw new NothingToUndoError();
    this.#last.undo();
    this.#last = undefined;
    this.message = '';
  }
}
