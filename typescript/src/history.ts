// Every edit the cart page ran, kept in order for Undo and Redo.

import type { Edit } from './edits.ts';

export class NothingToUndoError extends Error {
  override name = 'NothingToUndoError';
}

export class NothingToRedoError extends Error {
  override name = 'NothingToRedoError';
}

// The edits done and undone, newest last in each list.
export class History {
  readonly #done: Edit[] = [];
  readonly #undone: Edit[] = [];

  run(edit: Edit): void {
    edit.run();
    this.#done.push(edit);
  }

  undo(): void {
    const edit = this.#done.pop();
    if (edit === undefined) throw new NothingToUndoError();
    edit.undo();
    this.#undone.push(edit);
  }

  redo(): Edit {
    const edit = this.#undone.pop();
    if (edit === undefined) throw new NothingToRedoError();
    edit.run();
    this.#done.push(edit);
    return edit;
  }
}
