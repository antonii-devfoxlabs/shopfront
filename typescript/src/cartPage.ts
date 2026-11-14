// What the cart page's buttons call, and its Undo and Redo links.

import type { Cart } from './cart.ts';
import { apply, label, type Edit } from './edits.ts';
import { History } from './history.ts';

// Runs whichever edit a button hands it, and keeps it for Undo.
export class CartPage {
  // The message under the buttons, with its Undo and Redo links.
  message = '';
  // Every press, Undo and Redo, in order: replayed after a restart, they
  // rebuild the cart.
  readonly log: string[] = [];
  readonly #history: History<Edit>;

  constructor(cart: Cart) {
    this.#history = new History((edit: Edit) => apply(cart, edit));
  }

  press(edit: Edit): void {
    this.#history.run(edit);
    this.log.push(JSON.stringify(edit));
    this.message = label(edit);
  }

  undo(): void {
    this.#history.undo();
    this.log.push('Undo');
    this.message = '';
  }

  redo(): void {
    const edit = this.#history.redo();
    this.log.push('Redo');
    this.message = label(edit);
  }
}

// The page after a restart: the log replayed on a new cart.
export function restore(cart: Cart, log: readonly string[]): CartPage {
  const page = new CartPage(cart);
  for (const line of log) {
    if (line === 'Undo') page.undo();
    else if (line === 'Redo') page.redo();
    else {
      // JSON.parse answers any: the log is Shopfront's own, written by
      // press from an Edit, so it is read back as one unchecked.
      const edit: Edit = JSON.parse(line);
      page.press(edit);
    }
  }
  return page;
}
