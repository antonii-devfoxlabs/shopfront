// A shopper's cart: which products, and how many of each.

export class NotInCartError extends Error {
  override name = 'NotInCartError';
}

export class NothingToUndoError extends Error {
  override name = 'NothingToUndoError';
}

export type RemovedLine = { readonly sku: string; readonly quantity: number };

export class Cart {
  readonly lines = new Map<string, number>();
  // The line the last removal took away, for the cart page's Undo.
  removed: RemovedLine | undefined = undefined;

  add(sku: string, quantity = 1): void {
    if (quantity < 1) throw new RangeError('Add at least one');
    this.lines.set(sku, (this.lines.get(sku) ?? 0) + quantity);
  }

  changeQuantity(sku: string, quantity: number): void {
    if (!this.lines.has(sku)) throw new NotInCartError(sku);
    if (quantity < 1) this.lines.delete(sku);
    else this.lines.set(sku, quantity);
  }

  remove(sku: string): void {
    const quantity = this.lines.get(sku);
    if (quantity === undefined) throw new NotInCartError(sku);
    this.lines.delete(sku);
    this.removed = { sku, quantity };
  }

  // Put back the line the last removal took away.
  undoRemove(): void {
    if (this.removed === undefined) throw new NothingToUndoError();
    const { sku, quantity } = this.removed;
    this.removed = undefined;
    this.add(sku, quantity);
  }

  isEmpty(): boolean {
    return this.lines.size === 0;
  }
}
