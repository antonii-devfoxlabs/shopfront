// What a shopper asks the cart page to do, as data that can be written
// down, and the one function that runs it.

import type { Cart } from './cart.ts';
import type { Undo } from './history.ts';

export type AddLine = {
  readonly kind: 'AddLine';
  readonly sku: string;
  readonly quantity: number;
};

export type ChangeQuantity = {
  readonly kind: 'ChangeQuantity';
  readonly sku: string;
  readonly quantity: number;
};

export type RemoveLine = {
  readonly kind: 'RemoveLine';
  readonly sku: string;
};

export type EmptyCart = { readonly kind: 'EmptyCart' };

export type Edit = AddLine | ChangeQuantity | RemoveLine | EmptyCart;

// Runs the edit on the cart, and answers what takes it back.
export function apply(cart: Cart, edit: Edit): Undo {
  switch (edit.kind) {
    case 'AddLine': {
      // Read what the line held before the add: undo needs it.
      const before = cart.lines.get(edit.sku) ?? 0;
      cart.add(edit.sku, edit.quantity);
      if (before === 0) return () => cart.remove(edit.sku);
      return () => cart.changeQuantity(edit.sku, before);
    }
    case 'ChangeQuantity': {
      // Read the quantity before it changes: undo needs it.
      const before = cart.lines.get(edit.sku) ?? 0;
      cart.changeQuantity(edit.sku, edit.quantity);
      // A change to zero took the line away: add it back.
      if (edit.quantity < 1) return () => cart.add(edit.sku, before);
      return () => cart.changeQuantity(edit.sku, before);
    }
    case 'RemoveLine': {
      // Read the quantity before the line goes: undo needs it.
      const before = cart.lines.get(edit.sku) ?? 0;
      cart.remove(edit.sku);
      return () => cart.add(edit.sku, before);
    }
    case 'EmptyCart': {
      // A copy, made before the lines go: undo needs every one.
      const lines = new Map(cart.lines);
      for (const sku of lines.keys()) cart.remove(sku);
      return () => {
        for (const [sku, quantity] of lines) cart.add(sku, quantity);
      };
    }
    default: {
      const unhandled: never = edit;
      throw new Error(`unknown edit: ${JSON.stringify(unhandled)}`);
    }
  }
}

// What the page's message says about the edit.
export function label(edit: Edit): string {
  switch (edit.kind) {
    case 'AddLine':
      return `Added ${edit.sku}`;
    case 'ChangeQuantity':
      if (edit.quantity < 1) return `Removed ${edit.sku}`;
      return `${edit.sku} set to ${edit.quantity}`;
    case 'RemoveLine':
      return `Removed ${edit.sku}`;
    case 'EmptyCart':
      return 'Emptied the cart';
    default: {
      const unhandled: never = edit;
      throw new Error(`unknown edit: ${JSON.stringify(unhandled)}`);
    }
  }
}

// The minus button's edit: a removal at one, one fewer above it.
export function minus(cart: Cart, sku: string): Edit {
  const quantity = cart.lines.get(sku) ?? 0;
  if (quantity === 1) return { kind: 'RemoveLine', sku };
  return { kind: 'ChangeQuantity', sku, quantity: quantity - 1 };
}
