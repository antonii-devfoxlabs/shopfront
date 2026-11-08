// A shopper's cart: which products, and how many of each.

export class NotInCartError extends Error {
  override name = 'NotInCartError';
}

export class Cart {
  readonly lines = new Map<string, number>();

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
    if (!this.lines.delete(sku)) throw new NotInCartError(sku);
  }

  isEmpty(): boolean {
    return this.lines.size === 0;
  }
}
