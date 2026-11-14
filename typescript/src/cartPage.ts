// What the cart page's buttons call, and its Undo and Redo links.

import type { Edit } from './edits.ts';

export class NothingToUndoError extends Error {
  override name = 'NothingToUndoError';
}

export class NothingToRedoError extends Error {
  override name = 'NothingToRedoError';
}

// Runs whichever edit a button hands it, and keeps it for Undo.
export class CartPage {
  // The message under the buttons, with its Undo and Redo links.
  message = '';
  // The edits pressed, newest last: Undo takes the last one.
  readonly #done: Edit[] = [];
  // The edits undone, newest last: Redo takes the last one.
  readonly #undone: Edit[] = [];

  press(edit: Edit): void {
    edit.run();
    this.#done.push(edit);
    this.message = edit.label();
  }

  undo(): void {
    const edit = this.#done.pop();
    if (edit === undefined) throw new NothingToUndoError();
    edit.undo();
    this.#undone.push(edit);
    this.message = '';
  }

  redo(): void {
    const edit = this.#undone.pop();
    if (edit === undefined) throw new NothingToRedoError();
    edit.run();
    this.#done.push(edit);
    this.message = edit.label();
  }
}
