// An order, and what happens once it is placed.

import { EventEmitter } from 'node:events';

import type { Catalog } from './catalog.ts';
import type { Cursor } from './cursors.ts';
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

// Hands over the book's orders one at a time, the newest first. It keeps
// its own place, so each walk has a cursor of its own.
export class OrderCursor implements Cursor<Order> {
  readonly #orders: readonly Order[];
  #place: number;

  constructor(orders: readonly Order[]) {
    this.#orders = orders;
    this.#place = orders.length;
  }

  // The next older order, or undefined once every one is handed over.
  next(): Order | undefined {
    if (this.#place === 0) return undefined;
    this.#place -= 1;
    return this.#orders[this.#place];
  }
}

// Every order the store has placed, found by its number. The store has
// one: get it with OrderBook.instance().
export class OrderBook {
  static #instance: OrderBook | undefined;
  readonly #orders: Order[] = [];
  readonly #byId: Map<string, Order> = new Map();

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
    this.#orders.push(order);
    this.#byId.set(order.orderId, order);
  }

  find(orderId: string): Order {
    const order = this.#byId.get(orderId);
    if (order === undefined) throw new UnknownOrderError(orderId);
    return order;
  }

  // Every order in the book, in the order they were placed.
  orders(): Order[] {
    return [...this.#orders];
  }

  // A new walk over every order, from the newest.
  cursor(): OrderCursor {
    return new OrderCursor(this.#orders);
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

// What subscribing answers: call it to take that listener off again.
export type Cancel = () => void;

// The news an order's events carry, and what each hands its listeners.
// tsc refuses a name that is not here, and a listener or an emit that
// does not fit it.
export type OrderEventMap = {
  placed: [order: Order];
  refunded: [order: Order];
};

// Who hears of what happens to an order, by the news's name: 'placed' or
// 'refunded'. Node's EventEmitter keeps a list per name: subscribe with
// `on`, unsubscribe with `off`, notify with `emit`.
export class OrderEvents extends EventEmitter<OrderEventMap> {
  // Subscribe, and answer the way to cancel: whoever subscribes keeps it.
  subscribe(name: keyof OrderEventMap, listener: OrderListener): Cancel {
    this.on(name, listener);
    return () => {
      this.off(name, listener);
    };
  }
}

// Take the stock and keep the order, then announce it.
export function placeOrder(
  order: Order,
  catalog: Catalog,
  events: OrderEvents,
): void {
  catalog.takeAllFromStock(order.lines);
  OrderBook.instance().add(order);
  // The order is placed: now tell everyone subscribed at this moment.
  events.emit('placed', order);
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
