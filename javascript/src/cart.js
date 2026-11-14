// A shopper's cart: which products, and how many of each.

export class NotInCartError extends Error {
  name = 'NotInCartError';
}

export class NothingToUndoError extends Error {
  name = 'NothingToUndoError';
}

export class Cart {
  lines = new Map();
  // The line the last removal took away, for the cart page's Undo.
  removed = undefined;

  add(sku, quantity = 1) {
    if (quantity < 1) throw new RangeError('Add at least one');
    this.lines.set(sku, (this.lines.get(sku) ?? 0) + quantity);
  }

  changeQuantity(sku, quantity) {
    if (!this.lines.has(sku)) throw new NotInCartError(sku);
    if (quantity < 1) this.lines.delete(sku);
    else this.lines.set(sku, quantity);
  }

  remove(sku) {
    const quantity = this.lines.get(sku);
    if (!this.lines.delete(sku)) throw new NotInCartError(sku);
    this.removed = { sku, quantity };
  }

  // Put back the line the last removal took away.
  undoRemove() {
    if (this.removed === undefined) throw new NothingToUndoError();
    const { sku, quantity } = this.removed;
    this.removed = undefined;
    this.add(sku, quantity);
  }

  isEmpty() {
    return this.lines.size === 0;
  }
}
