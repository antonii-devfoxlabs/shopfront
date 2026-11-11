// An order, and what happens once it is placed.

import type { Catalog } from './catalog.ts';
import type { Settings } from './settings.ts';

export type OrderStatus = 'placed' | 'cancelled' | 'returned';

let lastOrderNumber = 0;

export function nextOrderId(): string {
  lastOrderNumber += 1;
  return `SF-${String(lastOrderNumber).padStart(5, '0')}`;
}

export class Order {
  readonly orderId: string;
  readonly customerEmail: string;
  readonly customerName: string;
  readonly subtotalCents: number;
  readonly discountCents: number;
  readonly taxCents: number;
  readonly shippingCents: number;
  readonly shippingCountry: string;
  readonly paymentMethod: string;
  readonly transactionId: string;
  readonly #lines: Map<string, number>;
  #status: OrderStatus = 'placed';

  constructor(
    orderId: string,
    customerEmail: string,
    customerName: string,
    lines: Iterable<[string, number]>,
    subtotalCents: number,
    discountCents: number,
    taxCents: number,
    shippingCents: number,
    shippingCountry: string,
    paymentMethod: string,
    transactionId: string,
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

  get lines(): ReadonlyMap<string, number> {
    // A copy each time, so not even a cast can reach the order's own.
    return new Map(this.#lines);
  }

  get status(): OrderStatus {
    return this.#status;
  }

  set status(status: OrderStatus) {
    this.#status = status;
  }

  get totalCents(): number {
    return (
      this.subtotalCents -
      this.discountCents +
      this.taxCents +
      this.shippingCents
    );
  }
}

export class IncompleteOrderError extends Error {
  override name = 'IncompleteOrderError';
}

// Takes an order's parts one at a time, by name, and builds it.
export class OrderBuilder {
  readonly #orderId: string;
  #email: string | undefined;
  #name: string | undefined;
  #lines: Iterable<[string, number]> | undefined;
  #subtotalCents: number | undefined;
  #discountCents = 0;
  #taxCents: number | undefined;
  #shippingCents: number | undefined;
  #country: string | undefined;
  #paidBy: string | undefined;
  #transactionId: string | undefined;

  constructor(orderId: string) {
    this.#orderId = orderId;
  }

  email(address: string): OrderBuilder {
    this.#email = address;
    return this;
  }

  name(name: string): OrderBuilder {
    this.#name = name;
    return this;
  }

  lines(lines: Iterable<[string, number]>): OrderBuilder {
    this.#lines = lines;
    return this;
  }

  subtotal(cents: number): OrderBuilder {
    this.#subtotalCents = cents;
    return this;
  }

  discount(cents: number): OrderBuilder {
    this.#discountCents = cents;
    return this;
  }

  tax(cents: number): OrderBuilder {
    this.#taxCents = cents;
    return this;
  }

  shipping(cents: number): OrderBuilder {
    this.#shippingCents = cents;
    return this;
  }

  country(code: string): OrderBuilder {
    this.#country = code;
    return this;
  }

  paidBy(method: string): OrderBuilder {
    this.#paidBy = method;
    return this;
  }

  transaction(transactionId: string): OrderBuilder {
    this.#transactionId = transactionId;
    return this;
  }

  build(): Order {
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

function given<T>(value: T | undefined, part: string): T {
  if (value === undefined) throw new IncompleteOrderError(part);
  return value;
}

// A new order with the parts that stay: who, what and where.
export function reorder(previous: Order, orderId: string): OrderBuilder {
  return new OrderBuilder(orderId)
    .email(previous.customerEmail)
    .name(previous.customerName)
    .lines(previous.lines)
    .country(previous.shippingCountry);
}

const SAMPLE = 'TEA-SAMPLE';
const SAMPLE_FROM_CENTS = 4_000;

// What goes into the parcel, one line per product.
export function packingSlip(order: Order): string[] {
  const slip = [...order.lines].map(
    ([sku, quantity]) => `${quantity} x ${sku}`,
  );
  if (order.totalCents >= SAMPLE_FROM_CENTS) {
    slip.push(`1 x ${SAMPLE}`);
  }
  return slip;
}

export class UnknownOrderError extends Error {
  override name = 'UnknownOrderError';
}

// Every order the store has placed, found by its number. The store has
// one: get it with OrderBook.instance().
export class OrderBook {
  static #instance: OrderBook | undefined;
  readonly #orders: Map<string, Order> = new Map();

  private constructor() {}

  // The store's order book, created the first time it is asked for.
  static instance(): OrderBook {
    OrderBook.#instance ??= new OrderBook();
    return OrderBook.#instance;
  }

  // For tests only: forget the book; the next ask makes a new one.
  static reset(): void {
    OrderBook.#instance = undefined;
  }

  add(order: Order): void {
    this.#orders.set(order.orderId, order);
  }

  find(orderId: string): Order {
    const order = this.#orders.get(orderId);
    if (order === undefined) throw new UnknownOrderError(orderId);
    return order;
  }

  // Every order in the book, in the order they were placed.
  orders(): Order[] {
    return [...this.#orders.values()];
  }
}

// For tests only: no orders, and numbers from SF-00001 again.
export function reset(): void {
  lastOrderNumber = 0;
  OrderBook.reset();
}

// Every part that must hear of a placed order fills this slot: a
// function that is told the order and answers nothing.
export type OrderListener = (order: Order) => void;

// Who hears of a placed order: a list the subject keeps for as long as
// the shop runs. Listeners join and leave it while the shop runs.
export class OrderEvents {
  readonly #listeners = new Set<OrderListener>();

  // Tell this listener of every order from now on, once each.
  subscribe(listener: OrderListener): void {
    this.#listeners.add(listener);
  }

  // Tell this listener nothing more; one not on the list is fine.
  unsubscribe(listener: OrderListener): void {
    this.#listeners.delete(listener);
  }

  // Tell every listener of the order, in the order they joined.
  notify(order: Order): void {
    // A copy: a listener that joins or leaves while they are told
    // changes the list for the next order, not for this one.
    for (const listener of [...this.#listeners]) {
      listener(order);
    }
  }
}

// Take the stock and keep the order, then tell every listener.
export function placeOrder(
  order: Order,
  catalog: Catalog,
  listeners: OrderListener[],
): void {
  catalog.takeAllFromStock(order.lines);
  OrderBook.instance().add(order);
  // The order is placed: now tell everyone who listens, in turn.
  for (const listener of listeners) {
    listener(order);
  }
}

// The owner's Monday line: the orders kept, and what they took.
export function salesReport(orders: Iterable<Order>, shop: Settings): string {
  const kept = [...orders].filter((order) => order.status === 'placed');
  let takings = 0;
  for (const order of kept) takings += order.totalCents;
  return `Orders: ${kept.length}, takings: ${formatMoney(takings, shop)}`;
}

export function formatMoney(cents: number, shop: Settings): string {
  const sign = cents < 0 ? '-' : '';
  const euros = Math.floor(Math.abs(cents) / 100);
  const rest = String(Math.abs(cents) % 100).padStart(2, '0');
  return `${sign}${euros}.${rest} ${shop.currency}`;
}
