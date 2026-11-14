// What the cart page's buttons call, and its Undo and Redo links.

import type { Cart } from './cart.ts';
import {
  AddLine,
  ChangeQuantity,
  EmptyCart,
  RemoveLine,
  type Edit,
} from './edits.ts';
import { History } from './history.ts';

// Runs whichever edit a button hands it, and keeps it for Undo.
export class CartPage {
  // The message under the buttons, with its Undo and Redo links.
  message = '';
  // Every press, Undo and Redo, in order: replayed after a restart, they
  // rebuild the cart.
  readonly log: string[] = [];
  readonly #history = new History();

  press(edit: Edit): void {
    this.#history.run(edit);
    this.log.push(edit.label());
    this.message = edit.label();
  }

  undo(): void {
    this.#history.undo();
    this.log.push('Undo');
    this.message = '';
  }

  redo(): void {
    const edit = this.#history.redo();
    this.log.push('Redo');
    this.message = edit.label();
  }
}

// The page after a restart: the log replayed on a new cart.
export function restore(cart: Cart, log: readonly string[]): CartPage {
  const page = new CartPage();
  for (const line of log) {
    if (line === 'Undo') page.undo();
    else if (line === 'Redo') page.redo();
    else page.press(editFromLabel(cart, line));
  }
  return page;
}

// A label is all an edit can say about itself: read the edit back from
// its words.
function editFromLabel(cart: Cart, label: string): Edit {
  if (label === 'Emptied the cart') return new EmptyCart(cart);
  if (label.startsWith('Added ')) {
    return new AddLine(cart, label.slice('Added '.length));
  }
  if (label.startsWith('Removed ')) {
    return new RemoveLine(cart, label.slice('Removed '.length));
  }
  const [sku = '', quantity = ''] = label.split(' set to ');
  return new ChangeQuantity(cart, sku, Number(quantity));
}
