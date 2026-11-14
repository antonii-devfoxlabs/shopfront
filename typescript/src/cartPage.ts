// What the cart page's buttons call, and its Undo of the last edit.

import type { Edit } from './edits.ts';

export class NothingToUndoError extends Error {
  override name = 'NothingToUndoError';
}

// Runs whichever edit a button hands it, and keeps it for Undo.
export class CartPage {
  // The message under the buttons, with its Undo link.
  message = '';
  #last: Edit | undefined = undefined;

  press(edit: Edit): void {
    edit.run();
    this.#last = edit;
    this.message = edit.label();
  }

  undo(): void {
    if (this.#last === undefined) throw new NothingToUndoError();
    this.#last.undo();
    this.#last = undefined;
    this.message = '';
  }
}
