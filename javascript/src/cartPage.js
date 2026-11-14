// What the cart page's buttons call, and its Undo and Redo links.

import { AddLine, ChangeQuantity, EmptyCart, RemoveLine } from './edits.js';
import { History } from './history.js';

/** @typedef {import('./cart.js').Cart} Cart */
/** @typedef {import('./edits.js').Edit} Edit */

// Runs whichever edit a button hands it, and keeps it for Undo.
export class CartPage {
  // The message under the buttons, with its Undo and Redo links.
  message = '';
  // Every press, Undo and Redo, in order: replayed after a restart, they
  // rebuild the cart.
  /** @type {string[]} */
  log = [];
  #history = new History();

  /** @param {Edit} edit */
  press(edit) {
    this.#history.run(edit);
    this.log.push(edit.label());
    this.message = edit.label();
  }

  undo() {
    this.#history.undo();
    this.log.push('Undo');
    this.message = '';
  }

  redo() {
    const edit = this.#history.redo();
    this.log.push('Redo');
    this.message = edit.label();
  }
}

// The page after a restart: the log replayed on a new cart.
/**
 * @param {Cart} cart
 * @param {string[]} log
 * @returns {CartPage}
 */
export function restore(cart, log) {
  const page = new CartPage();
  for (const line of log) {
    if (line === 'Undo') page.undo();
    else if (line === 'Redo') page.redo();
    else page.press(editFromLabel(cart, line));
  }
  return page;
}

// A label is all an edit can say about itself: read the edit back from
// its words.
/**
 * @param {Cart} cart
 * @param {string} label
 * @returns {Edit}
 */
function editFromLabel(cart, label) {
  if (label === 'Emptied the cart') return new EmptyCart(cart);
  if (label.startsWith('Added ')) {
    return new AddLine(cart, label.slice('Added '.length));
  }
  if (label.startsWith('Removed ')) {
    return new RemoveLine(cart, label.slice('Removed '.length));
  }
  const [sku, quantity] = label.split(' set to ');
  return new ChangeQuantity(cart, sku, Number(quantity));
}
