// What the cart page's buttons call, and its Undo and Redo links.

import type { Edit } from './edits.ts';
import { History } from './history.ts';

// Runs whichever edit a button hands it, and keeps it for Undo.
export class CartPage {
  // The message under the buttons, with its Undo and Redo links.
  message = '';
  readonly #history = new History();

  press(edit: Edit): void {
    this.#history.run(edit);
    this.message = edit.label();
  }

  undo(): void {
    this.#history.undo();
    this.message = '';
  }

  redo(): void {
    const edit = this.#history.redo();
    this.message = edit.label();
  }
}
