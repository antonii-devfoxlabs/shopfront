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
    this.log.push(label(edit));
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
    else page.press(editFromLabel(line));
  }
  return page;
}

// A label is all the log keeps of an edit: read the edit back from its
// words.
function editFromLabel(text: string): Edit {
  if (text === 'Emptied the cart') return { kind: 'EmptyCart' };
  if (text.startsWith('Added ')) {
    return { kind: 'AddLine', sku: text.slice('Added '.length), quantity: 1 };
  }
  if (text.startsWith('Removed ')) {
    return { kind: 'RemoveLine', sku: text.slice('Removed '.length) };
  }
  const [sku = '', quantity = ''] = text.split(' set to ');
  return { kind: 'ChangeQuantity', sku, quantity: Number(quantity) };
}
