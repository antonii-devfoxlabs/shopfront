// An order, and what happens once it is placed.

import { EventEmitter } from 'node:events';

let lastOrderNumber = 0;

export function nextOrderId() {
  lastOrderNumber += 1;
  return `SF-${String(lastOrderNumber).padStart(5, '0')}`;
}

export class DispatchRefusedError extends Error {
  name = 'DispatchRefusedError';
}

export class CancelRefusedError extends Error {
  name = 'CancelRefusedError';
}

export class ReturnRefusedError extends Error {
  name = 'ReturnRefusedError';
}

export class Order {
  #lines;
  #status = 'placed';
  // The parcel the warehouse handed a courier: null until dispatched.
  /** @type {import('./parcels.js').Parcel | null} */
  #parcel = null;

  constructor(
    orderId,
    customerEmail,
    customerName,
    lines,
    subtotalCents,
    discountCents,
    taxCents,
    shippingCents,
    shippingCountry,
    paymentMethod,
    transactionId,
  ) {
    this.orderId = orderId;
    this.customerEmail = customerEmail;
    this.customerName = customerName;
    this.#lines = new Map(lines);
    this.subtotalCents = subtotalCents;
    this.discountCents = discountCents;
    this.taxCents = taxCents;
    this.shippingCents = shippingCents;
    this.shippingCountry = shippingCountry;
    this.paymentMethod = paymentMethod;
    this.transactionId = transactionId;
    // Each part is set once, here; only the order's own moves change the
    // status, and the parcel once the order leaves.
    Object.freeze(this);
  }

  get lines() {
    // A copy each time: JavaScript has no read-only Map.
    return new Map(this.#lines);
  }

  get status() {
    return this.#status;
  }

  get parcel() {
    return this.#parcel;
  }

  // Where the shopper can follow the order's parcel: null until the order
  // is dispatched.
  trackingLink() {
    if (this.#parcel === null) return null;
    return this.#parcel.trackingLink();
  }

  // The order's moves: the only code that changes its status. Each
  // refuses a move its status's row in STATUSES does not allow.

  /**
   * Its parcel has left the warehouse with a courier.
   * @param {import('./parcels.js').Parcel} parcel
   */
  markDispatched(parcel) {
    if (!statusOf(this).dispatchable) {
      throw new DispatchRefusedError(`${this.orderId} is ${this.#status}`);
    }
    this.#parcel = parcel;
    this.#status = 'dispatched';
  }

  // The shopper no longer wants it, and it has not left yet.
  markCancelled() {
    if (!statusOf(this).cancellable) {
      throw new CancelRefusedError(`${this.orderId} is ${this.#status}`);
    }
    this.#status = 'cancelled';
  }

  // Refuse a return before any money goes back for it.
  checkReturnable() {
    if (!statusOf(this).returnable) {
      throw new ReturnRefusedError(`${this.orderId} is ${this.#status}`);
    }
  }

  // It came back, and its money went back.
  markReturned() {
    this.checkReturnable();
    this.#status = 'returned';
  }

  // It came back for the same product again.
  markExchanged() {
    this.checkReturnable();
    this.#status = 'exchanged';
  }

  get totalCents() {
    return (
      this.subtotalCents -
      this.discountCents +
      this.taxCents +
      this.shippingCents
    );
  }
}

export class UnknownStatusError extends Error {
  name = 'UnknownStatusError';
}

/**
 * What the rest of the store needs to know of an order's status.
 * @typedef {object} Status
 * @property {boolean} sale Counted in the takings and in the
 *   accountant's sales files.
 * @property {boolean} returnable Can still be sent back for its money.
 * @property {boolean} dispatchable Can still leave the warehouse.
 * @property {boolean} cancellable Can still be cancelled: it has never
 *   left the warehouse.
 */

/**
 * Every status an order can have, and what it means. A new status is a
 * new row: the code that asks what a status means reads it here.
 * @type {ReadonlyMap<string, Status>}
 */
const STATUSES = new Map([
  [
    'placed',
    { sale: true, returnable: true, dispatchable: true, cancellable: true },
  ],
  [
    'dispatched',
    { sale: true, returnable: true, dispatchable: false, cancellable: false },
  ],
  [
    'cancelled',
    {
      sale: false,
      returnable: false,
      dispatchable: false,
      cancellable: false,
    },
  ],
  [
    'returned',
    {
      sale: false,
      returnable: false,
      dispatchable: false,
      cancellable: false,
    },
  ],
  // Sent back for the same product again: the sale stands, and the new one
  // has still to leave the warehouse.
  [
    'exchanged',
    { sale: true, returnable: true, dispatchable: true, cancellable: false },
  ],
]);

/**
 * What the order's status means: its row in STATUSES.
 * @param {Order} order
 * @returns {Status}
 */
export function statusOf(order) {
  const status = STATUSES.get(order.status);
  if (status === undefined) {
    throw new UnknownStatusError(order.status);
  }
  return status;
}

export class IncompleteOrderError extends Error {
  name = 'IncompleteOrderError';
}

// Takes an order's parts one at a time, by name, and builds it.
export class OrderBuilder {
  #orderId;
  #email;
  #name;
  #lines;
  #subtotalCents;
  #discountCents = 0;
  #taxCents;
  #shippingCents;
  #country;
  #paidBy;
  #transactionId;

  constructor(orderId) {
    this.#orderId = orderId;
  }

  email(address) {
    this.#email = address;
    return this;
  }

  name(name) {
    this.#name = name;
    return this;
  }

  lines(lines) {
    this.#lines = lines;
    return this;
  }

  subtotal(cents) {
    this.#subtotalCents = cents;
    return this;
  }

  discount(cents) {
    this.#discountCents = cents;
    return this;
  }

  tax(cents) {
    this.#taxCents = cents;
    return this;
  }

  shipping(cents) {
    this.#shippingCents = cents;
    return this;
  }

  country(code) {
    this.#country = code;
    return this;
  }

  paidBy(method) {
    this.#paidBy = method;
    return this;
  }

  transaction(transactionId) {
    this.#transactionId = transactionId;
    return this;
  }

  build() {
    return new Order(
      this.#orderId,
      given(this.#email, 'email'),
      given(this.#name, 'name'),
      given(this.#lines, 'lines'),
      given(this.#subtotalCents, 'subtotal'),
      this.#discountCents,
      given(this.#taxCents, 'tax'),
      given(this.#shippingCents, 'shipping'),
      given(this.#country, 'country'),
      given(this.#paidBy, 'paidBy'),
      given(this.#transactionId, 'transaction'),
    );
  }
}

function given(value, part) {
  if (value === undefined) throw new IncompleteOrderError(part);
  return value;
}

// A new order with the parts that stay: who, what and where.
export function reorder(previous, orderId) {
  return new OrderBuilder(orderId)
    .email(previous.customerEmail)
    .name(previous.customerName)
    .lines(previous.lines)
    .country(previous.shippingCountry);
}
export class UnknownOrderError extends Error {
  name = 'UnknownOrderError';
}

// Every order the store has placed, found by its number. main makes the
// store's one book and hands it to every part that keeps or finds orders.
export class OrderBook {
  #orders = [];
  #byId = new Map();

  add(order) {
    this.#orders.push(order);
    this.#byId.set(order.orderId, order);
  }

  find(orderId) {
    const order = this.#byId.get(orderId);
    if (order === undefined) throw new UnknownOrderError(orderId);
    return order;
  }

  // Every order in the book, in the order they were placed.
  orders() {
    return [...this.#orders];
  }

  // A new walk over every order, from the newest.
  *cursor() {
    let place = this.#orders.length;
    while (place > 0) {
      place -= 1;
      yield this.#orders[place];
    }
  }

  // What a for...of loop asks for: a new cursor, from the newest.
  [Symbol.iterator]() {
    return this.cursor();
  }
}

// For tests only: order numbers from SF-00001 again.
export function reset() {
  lastOrderNumber = 0;
}

/**
 * Every part that must hear of a placed order fills this slot: a
 * function that is told the order and answers nothing.
 * @callback OrderListener
 * @param {Order} order
 * @returns {void}
 */

// The news an order's events carry. Name it through these, never as a
// string: a misspelt constant is an error, where a misspelt string is
// a list nobody is told.
export const PLACED = 'placed';
export const REFUNDED = 'refunded';
export const DISPATCHED = 'dispatched';

/**
 * What subscribing answers: call it to take that listener off again.
 * @callback Cancel
 * @returns {void}
 */

/**
 * Who hears of what happens to an order, by the news's name: PLACED,
 * REFUNDED or DISPATCHED. Node's EventEmitter keeps a list per name:
 * subscribe with `on`, unsubscribe with `off`, notify with `emit`.
 */
export class OrderEvents extends EventEmitter {
  /**
   * Subscribe, and answer the way to cancel: whoever subscribes keeps it.
   * @param {string} name
   * @param {OrderListener} listener
   * @returns {Cancel}
   */
  subscribe(name, listener) {
    this.on(name, listener);
    return () => {
      this.off(name, listener);
    };
  }
}

/**
 * Take the stock and keep the order in the book, then announce it.
 * @param {Order} order
 * @param {import('./catalog.js').Catalog} catalog
 * @param {OrderBook} book
 * @param {OrderEvents} events
 */
export function placeOrder(order, catalog, book, events) {
  catalog.takeAllFromStock(order.lines);
  book.add(order);
  // The order is placed: now tell everyone subscribed at this moment.
  events.emit(PLACED, order);
}

/**
 * Mark an order dispatched: its parcel has left the warehouse with a
 * courier. Then announce it.
 * @param {Order} order
 * @param {import('./parcels.js').Parcel} parcel
 * @param {OrderEvents} events
 */
export function dispatch(order, parcel, events) {
  order.markDispatched(parcel);
  events.emit(DISPATCHED, order);
}
