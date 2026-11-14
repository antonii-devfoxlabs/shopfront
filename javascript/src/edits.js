// What a shopper asks the cart page to do, kept so it can be undone.

// Takes one line out of the cart, and can put it back.
export class RemoveLine {
  #cart;
  #sku;
  #quantity = 0;

  constructor(cart, sku) {
    this.#cart = cart;
    this.#sku = sku;
  }

  run() {
    // Read the quantity before the line goes: undo needs it.
    this.#quantity = this.#cart.lines.get(this.#sku) ?? 0;
    this.#cart.remove(this.#sku);
  }

  undo() {
    this.#cart.add(this.#sku, this.#quantity);
  }
}
