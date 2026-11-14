// What the cart page's buttons call, and its Undo and Redo links.

/** @typedef {import('./edits.js').Edit} Edit */

export class NothingToUndoError extends Error {
  name = 'NothingToUndoError';
}

export class NothingToRedoError extends Error {
  name = 'NothingToRedoError';
}

// Runs whichever edit a button hands it, and keeps it for Undo.
export class CartPage {
  // The message under the buttons, with its Undo and Redo links.
  message = '';
  // The edits pressed, newest last: Undo takes the last one.
  /** @type {Edit[]} */
  #done = [];
  // The edits undone, newest last: Redo takes the last one.
  /** @type {Edit[]} */
  #undone = [];

  /** @param {Edit} edit */
  press(edit) {
    edit.run();
    this.#done.push(edit);
    this.message = edit.label();
  }

  undo() {
    const edit = this.#done.pop();
    if (edit === undefined) throw new NothingToUndoError();
    edit.undo();
    this.#undone.push(edit);
    this.message = '';
  }

  redo() {
    const edit = this.#undone.pop();
    if (edit === undefined) throw new NothingToRedoError();
    edit.run();
    this.#done.push(edit);
    this.message = edit.label();
  }
}
