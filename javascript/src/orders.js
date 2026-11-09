// An order, and what happens once it is placed.

import * as settings from './settings.js';

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

// Every order the store has placed, found by its number. The store has
// one: get it with OrderBook.instance().
export class OrderBook {
  static #instance = null;
  #orders = new Map();

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

  add(order) {
    this.#orders.set(order.orderId, order);
  }

  find(orderId) {
    const order = this.#orders.get(orderId);
    if (order === undefined) throw new UnknownOrderError(orderId);
    return order;
  }
}
export function placeOrder(order, catalog, mailer, analytics) {
  catalog.takeAllFromStock(order.lines);
  OrderBook.instance().add(order);
  mailer.send({
    from: settings.current.storeEmail,
    to: order.customerEmail,
    subject: `${settings.current.storeName}: order ${order.orderId}`,
    body:
      `Hi ${order.customerName}, thank you! ` +
      `We have your order ${order.orderId}, ` +
      `${formatMoney(order.totalCents)} in all.`,
  });
  analytics.track('order_placed', {
    order_id: order.orderId,
    total_cents: order.totalCents,
  });
}

export function formatMoney(cents) {
  const sign = cents < 0 ? '-' : '';
  const euros = Math.floor(Math.abs(cents) / 100);
  const rest = String(Math.abs(cents) % 100).padStart(2, '0');
  return `${sign}${euros}.${rest} ${settings.current.currency}`;
}
