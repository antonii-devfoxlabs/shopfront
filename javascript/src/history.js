// Every edit the cart page ran, kept in order for Undo and Redo.

/** @typedef {() => void} Undo What takes one edit back. */

export class NothingToUndoError extends Error {
  name = 'NothingToUndoError';
}

export class NothingToRedoError extends Error {
  name = 'NothingToRedoError';
}

// The edits done and undone, newest last in each list.
/** @template E */
export class History {
  // Runs an edit, and answers what takes it back.
  /** @type {(edit: E) => Undo} */
  #apply;
  // Each edit done, with what takes it back.
  /** @type {{ edit: E, undo: Undo }[]} */
  #done = [];
  /** @type {E[]} */
  #undone = [];

  /** @param {(edit: E) => Undo} apply */
  constructor(apply) {
    this.#apply = apply;
  }

  /** @param {E} edit */
  run(edit) {
    this.#done.push({ edit, undo: this.#apply(edit) });
    // The undone edits were undone on a cart that has moved on since:
    // let go of them, so Redo cannot run one on the wrong cart.
    this.#undone.length = 0;
  }

  undo() {
    const last = this.#done.pop();
    if (last === undefined) throw new NothingToUndoError();
    last.undo();
    this.#undone.push(last.edit);
  }

  /** @returns {E} */
  redo() {
    const edit = this.#undone.pop();
    if (edit === undefined) throw new NothingToRedoError();
    this.#done.push({ edit, undo: this.#apply(edit) });
    return edit;
  }
}
