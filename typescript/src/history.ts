// Every edit the cart page ran, kept in order for Undo and Redo.

// What takes one edit back: a function that needs nothing more.
export type Undo = () => void;

export class NothingToUndoError extends Error {
  override name = 'NothingToUndoError';
}

export class NothingToRedoError extends Error {
  override name = 'NothingToRedoError';
}

// The edits done and undone, newest last in each list.
export class History<E> {
  // Runs an edit, and answers what takes it back.
  readonly #apply: (edit: E) => Undo;
  // Each edit done, with what takes it back.
  readonly #done: { edit: E; undo: Undo }[] = [];
  readonly #undone: E[] = [];

  constructor(apply: (edit: E) => Undo) {
    this.#apply = apply;
  }

  run(edit: E): void {
    this.#done.push({ edit, undo: this.#apply(edit) });
    // The undone edits were undone on a cart that has moved on since:
    // let go of them, so Redo cannot run one on the wrong cart.
    this.#undone.length = 0;
  }

  undo(): void {
    const last = this.#done.pop();
    if (last === undefined) throw new NothingToUndoError();
    last.undo();
    this.#undone.push(last.edit);
  }

  redo(): E {
    const edit = this.#undone.pop();
    if (edit === undefined) throw new NothingToRedoError();
    this.#done.push({ edit, undo: this.#apply(edit) });
    return edit;
  }
}
