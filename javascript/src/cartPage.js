// What the cart page's buttons call, and its Undo and Redo links.

import { History } from './history.js';

/** @typedef {import('./edits.js').Edit} Edit */

// Runs whichever edit a button hands it, and keeps it for Undo.
export class CartPage {
  // The message under the buttons, with its Undo and Redo links.
  message = '';
  #history = new History();

  /** @param {Edit} edit */
  press(edit) {
    this.#history.run(edit);
    this.message = edit.label();
  }

  undo() {
    this.#history.undo();
    this.message = '';
  }

  redo() {
    const edit = this.#history.redo();
    this.message = edit.label();
  }
}
