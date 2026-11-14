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
    this.log.push(label(edit));
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
    else page.press(editFromLabel(line));
  }
  return page;
}

// A label is all the log keeps of an edit: read the edit back from its
// words.
/**
 * @param {string} text
 * @returns {Edit}
 */
function editFromLabel(text) {
  if (text === 'Emptied the cart') return { kind: 'EmptyCart' };
  if (text.startsWith('Added ')) {
    return { kind: 'AddLine', sku: text.slice('Added '.length), quantity: 1 };
  }
  if (text.startsWith('Removed ')) {
    return { kind: 'RemoveLine', sku: text.slice('Removed '.length) };
  }
  const [sku, quantity] = text.split(' set to ');
  return { kind: 'ChangeQuantity', sku, quantity: Number(quantity) };
}
