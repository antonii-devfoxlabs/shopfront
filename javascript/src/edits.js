// What a shopper asks the cart page to do, as data that can be written
// down, and the one function that runs it.

/** @typedef {import('./cart.js').Cart} Cart */
/** @typedef {import('./history.js').Undo} Undo */

/**
 * @typedef {{ kind: 'AddLine', sku: string, quantity: number }
 *   | { kind: 'ChangeQuantity', sku: string, quantity: number }
 *   | { kind: 'RemoveLine', sku: string }
 *   | { kind: 'EmptyCart' }} Edit
 */

// Runs the edit on the cart, and answers what takes it back.
/**
 * @param {Cart} cart
 * @param {Edit} edit
 * @returns {Undo}
 */
export function apply(cart, edit) {
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
    default:
      throw new Error(`unknown edit: ${JSON.stringify(edit)}`);
  }
}

// What the page's message says about the edit.
/**
 * @param {Edit} edit
 * @returns {string}
 */
export function label(edit) {
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
    default:
      throw new Error(`unknown edit: ${JSON.stringify(edit)}`);
  }
}

// The minus button's edit: a removal at one, one fewer above it.
/**
 * @param {Cart} cart
 * @param {string} sku
 * @returns {Edit}
 */
export function minus(cart, sku) {
  const quantity = cart.lines.get(sku) ?? 0;
  if (quantity === 1) return { kind: 'RemoveLine', sku };
  return { kind: 'ChangeQuantity', sku, quantity: quantity - 1 };
}
