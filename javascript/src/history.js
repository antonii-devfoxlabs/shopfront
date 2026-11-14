// Every edit the cart page ran, kept in order for Undo and Redo.

/** @typedef {import('./edits.js').Edit} Edit */

export class NothingToUndoError extends Error {
  name = 'NothingToUndoError';
}

export class NothingToRedoError extends Error {
  name = 'NothingToRedoError';
}

// The edits done and undone, newest last in each list.
export class History {
  /** @type {Edit[]} */
  #done = [];
  /** @type {Edit[]} */
  #undone = [];

  /** @param {Edit} edit */
  run(edit) {
    edit.run();
    this.#done.push(edit);
    // The undone edits were undone on a cart that has moved on since:
    // let go of them, so Redo cannot run one on the wrong cart.
    this.#undone.length = 0;
  }

  undo() {
    const edit = this.#done.pop();
    if (edit === undefined) throw new NothingToUndoError();
    edit.undo();
    this.#undone.push(edit);
  }

  /** @returns {Edit} */
  redo() {
    const edit = this.#undone.pop();
    if (edit === undefined) throw new NothingToRedoError();
    edit.run();
    this.#done.push(edit);
    return edit;
  }
}
