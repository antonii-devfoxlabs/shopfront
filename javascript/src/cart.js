// A shopper's cart: which products, and how many of each.

export class NotInCartError extends Error {
  name = 'NotInCartError';
}

export class Cart {
  lines = new Map();

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
    if (!this.lines.delete(sku)) throw new NotInCartError(sku);
  }

  isEmpty() {
    return this.lines.size === 0;
  }
}
