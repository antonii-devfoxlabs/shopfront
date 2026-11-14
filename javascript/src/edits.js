// What a shopper asks the cart page to do, kept so it can be undone.

/**
 * The slot every cart edit fills, so the page can run any of them.
 * @typedef {object} Edit
 * @property {() => void} run
 * @property {() => void} undo
 * @property {() => string} label
 */

// Adds to a line, and can take the addition back.
export class AddLine {
  #cart;
  #sku;
  #quantity;
  #before = 0;

  constructor(cart, sku, quantity = 1) {
    this.#cart = cart;
    this.#sku = sku;
    this.#quantity = quantity;
  }

  run() {
    // Read what the line held before the add: undo needs it.
    this.#before = this.#cart.lines.get(this.#sku) ?? 0;
    this.#cart.add(this.#sku, this.#quantity);
  }

  undo() {
    if (this.#before === 0) this.#cart.remove(this.#sku);
    else this.#cart.changeQuantity(this.#sku, this.#before);
  }

  label() {
    return `Added ${this.#sku}`;
  }
}

// Sets a line's quantity, and can set it back.
export class ChangeQuantity {
  #cart;
  #sku;
  #quantity;
  #before = 0;

  constructor(cart, sku, quantity) {
    this.#cart = cart;
    this.#sku = sku;
    this.#quantity = quantity;
  }

  run() {
    // Read the quantity before it changes: undo needs it.
    this.#before = this.#cart.lines.get(this.#sku) ?? 0;
    this.#cart.changeQuantity(this.#sku, this.#quantity);
  }

  undo() {
    // A change to zero took the line away: add it back.
    if (this.#quantity < 1) this.#cart.add(this.#sku, this.#before);
    else this.#cart.changeQuantity(this.#sku, this.#before);
  }

  label() {
    if (this.#quantity < 1) return `Removed ${this.#sku}`;
    return `${this.#sku} set to ${this.#quantity}`;
  }
}

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

  label() {
    return `Removed ${this.#sku}`;
  }
}

// Takes every line out of the cart, and can put them all back.
export class EmptyCart {
  #cart;
  #lines = new Map();

  constructor(cart) {
    this.#cart = cart;
  }

  run() {
    // A copy, made before the lines go: undo needs every one.
    this.#lines = new Map(this.#cart.lines);
    for (const sku of this.#lines.keys()) this.#cart.remove(sku);
  }

  undo() {
    for (const [sku, quantity] of this.#lines) {
      this.#cart.add(sku, quantity);
    }
  }
  label() {
    return 'Emptied the cart';
  }
}
