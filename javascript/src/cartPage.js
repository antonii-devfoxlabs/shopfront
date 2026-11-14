// What the cart page's buttons call, and its Undo of the last edit.

/** @typedef {import('./edits.js').Edit} Edit */

export class NothingToUndoError extends Error {
  name = 'NothingToUndoError';
}

// Runs whichever edit a button hands it, and keeps it for Undo.
export class CartPage {
  // The message under the buttons, with its Undo link.
  message = '';
  /** @type {Edit | undefined} */
  #last = undefined;

  /** @param {Edit} edit */
  press(edit) {
    edit.run();
    this.#last = edit;
    this.message = edit.label();
  }

  undo() {
    if (this.#last === undefined) throw new NothingToUndoError();
    this.#last.undo();
    this.#last = undefined;
    this.message = '';
  }
}
