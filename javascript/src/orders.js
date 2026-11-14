// An order, and what happens once it is placed.

import { EventEmitter } from 'node:events';

let lastOrderNumber = 0;

export function nextOrderId() {
  lastOrderNumber += 1;
  return `SF-${String(lastOrderNumber).padStart(5, '0')}`;
}

export class Order {
  #lines;
  #status = 'placed';

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
    // Each part is set once, here; only the status changes.
    Object.freeze(this);
  }

  get lines() {
    // A copy each time: JavaScript has no read-only Map.
    return new Map(this.#lines);
  }

  get status() {
    return this.#status;
  }

  set status(status) {
    this.#status = status;
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

const SAMPLE = 'TEA-SAMPLE';
const SAMPLE_FROM_CENTS = 4_000;

// What goes into the parcel, one line per product.
export function packingSlip(order) {
  const slip = [...order.lines].map(
    ([sku, quantity]) => `${quantity} x ${sku}`,
  );
  if (order.totalCents >= SAMPLE_FROM_CENTS) {
    slip.push(`1 x ${SAMPLE}`);
  }
  return slip;
}

export class UnknownOrderError extends Error {
  name = 'UnknownOrderError';
}

// Hands over the book's orders one at a time, the newest first. It keeps
// its own place, so each walk has a cursor of its own.
export class OrderCursor {
  #orders;
  #place;

  constructor(orders) {
    this.#orders = orders;
    this.#place = orders.length;
  }

  // The next older order, or undefined once every one is handed over.
  next() {
    if (this.#place === 0) return undefined;
    this.#place -= 1;
    return this.#orders[this.#place];
  }
}

// Every order the store has placed, found by its number. The store has
// one: get it with OrderBook.instance().
export class OrderBook {
  static #instance = null;
  #orders = [];
  #byId = new Map();

  constructor() {
    if (OrderBook.#instance !== null) {
      throw new Error('the store has one order book: use instance()');
    }
    OrderBook.#instance = this;
  }

  // The store's order book, created the first time it is asked for.
  static instance() {
    return OrderBook.#instance ?? new OrderBook();
  }

  // For tests only: forget the book; the next ask makes a new one.
  static reset() {
    OrderBook.#instance = null;
  }

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
  cursor() {
    return new OrderCursor(this.#orders);
  }
}
// For tests only: no orders, and numbers from SF-00001 again.
export function reset() {
  lastOrderNumber = 0;
  OrderBook.reset();
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

/**
 * What subscribing answers: call it to take that listener off again.
 * @callback Cancel
 * @returns {void}
 */

/**
 * Who hears of what happens to an order, by the news's name: PLACED or
 * REFUNDED. Node's EventEmitter keeps a list per name: subscribe with
 * `on`, unsubscribe with `off`, notify with `emit`.
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
 * Take the stock and keep the order, then announce it.
 * @param {Order} order
 * @param {import('./catalog.js').Catalog} catalog
 * @param {OrderEvents} events
 */
export function placeOrder(order, catalog, events) {
  catalog.takeAllFromStock(order.lines);
  OrderBook.instance().add(order);
  // The order is placed: now tell everyone subscribed at this moment.
  events.emit(PLACED, order);
}

// The owner's Monday line: the orders kept, and what they took.
export function salesReport(orders, shop) {
  const kept = [...orders].filter((order) => order.status === 'placed');
  let takings = 0;
  for (const order of kept) takings += order.totalCents;
  return `Orders: ${kept.length}, takings: ${formatMoney(takings, shop)}`;
}

export function formatMoney(cents, shop) {
  const sign = cents < 0 ? '-' : '';
  const euros = Math.floor(Math.abs(cents) / 100);
  const rest = String(Math.abs(cents) % 100).padStart(2, '0');
  return `${sign}${euros}.${rest} ${shop.currency}`;
}
