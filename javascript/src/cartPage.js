// What the cart page's buttons call, and its Undo and Redo links.

import { apply, label } from './edits.js';
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
  /** @type {History<Edit>} */
  #history;

  /** @param {Cart} cart */
  constructor(cart) {
    this.#history = new History((edit) => apply(cart, edit));
  }

  /** @param {Edit} edit */
  press(edit) {
    this.#history.run(edit);
    this.log.push(JSON.stringify(edit));
    this.message = label(edit);
  }

  undo() {
    this.#history.undo();
    this.log.push('Undo');
    this.message = '';
  }

  redo() {
    const edit = this.#history.redo();
    this.log.push('Redo');
    this.message = label(edit);
  }
}

// The page after a restart: the log replayed on a new cart.
/**
 * @param {Cart} cart
 * @param {string[]} log
 * @returns {CartPage}
 */
export function restore(cart, log) {
  const page = new CartPage(cart);
  for (const line of log) {
    if (line === 'Undo') page.undo();
    else if (line === 'Redo') page.redo();
    else page.press(JSON.parse(line));
  }
  return page;
}
