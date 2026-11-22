// An order, and what happens once it is placed.

import { EventEmitter } from 'node:events';

import type { Catalog } from './catalog.ts';
import type { Parcel } from './parcels.ts';

export type OrderStatus =
  | 'placed'
  | 'dispatched'
  | 'cancelled'
  | 'returned'
  | 'exchanged';

let lastOrderNumber = 0;

export function nextOrderId(): string {
  lastOrderNumber += 1;
  return `SF-${String(lastOrderNumber).padStart(5, '0')}`;
}

export class DispatchRefusedError extends Error {
  override name = 'DispatchRefusedError';
}

export class CancelRefusedError extends Error {
  override name = 'CancelRefusedError';
}

export class ReturnRefusedError extends Error {
  override name = 'ReturnRefusedError';
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
  // The parcel the warehouse handed a courier: null until dispatched.
  #parcel: Parcel | null = null;

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
    // Each part is set once, here; only the order's own moves change the
    // status, and the parcel once the order leaves.
    Object.freeze(this);
  }

  get lines(): ReadonlyMap<string, number> {
    // A copy each time, so not even a cast can reach the order's own.
    return new Map(this.#lines);
  }

  get status(): OrderStatus {
    return this.#status;
  }

  get parcel(): Parcel | null {
    return this.#parcel;
  }

  // Where the shopper can follow the order's parcel: null until the order
  // is dispatched.
  trackingLink(): string | null {
    if (this.#parcel === null) return null;
    return this.#parcel.trackingLink();
  }

  // The order's moves: the only code that changes its status. Each
  // refuses a move its status's row in STATUSES does not allow.

  // Its parcel has left the warehouse with a courier.
  markDispatched(parcel: Parcel): void {
    if (!statusOf(this).dispatchable) {
      throw new DispatchRefusedError(`${this.orderId} is ${this.#status}`);
    }
    this.#parcel = parcel;
    this.#status = 'dispatched';
  }

  // The shopper no longer wants it, and it has not left yet.
  markCancelled(): void {
    if (!statusOf(this).cancellable) {
      throw new CancelRefusedError(`${this.orderId} is ${this.#status}`);
    }
    this.#status = 'cancelled';
  }

  // Refuse a return before any money goes back for it.
  checkReturnable(): void {
    if (!statusOf(this).returnable) {
      throw new ReturnRefusedError(`${this.orderId} is ${this.#status}`);
    }
  }

  // It came back, and its money went back.
  markReturned(): void {
    this.checkReturnable();
    this.#status = 'returned';
  }

  // It came back for the same product again.
  markExchanged(): void {
    this.checkReturnable();
    this.#status = 'exchanged';
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

// What the rest of the store needs to know of an order's status.
export type Status = {
  // Counted in the takings and in the accountant's sales files.
  readonly sale: boolean;
  // Can still be sent back for its money.
  readonly returnable: boolean;
  // Can still leave the warehouse.
  readonly dispatchable: boolean;
  // Can still be cancelled: it has never left the warehouse.
  readonly cancellable: boolean;
};

// Every status an order can have, and what it means. A new status is a
// new row: the code that asks what a status means reads it here.
const STATUSES: Readonly<Record<OrderStatus, Status>> = Object.freeze({
  placed: {
    sale: true,
    returnable: true,
    dispatchable: true,
    cancellable: true,
  },
  dispatched: {
    sale: true,
    returnable: true,
    dispatchable: false,
    cancellable: false,
  },
  cancelled: {
    sale: false,
    returnable: false,
    dispatchable: false,
    cancellable: false,
  },
  returned: {
    sale: false,
    returnable: false,
    dispatchable: false,
    cancellable: false,
  },
  // Sent back for the same product again: the sale stands, and the new one
  // has still to leave the warehouse.
  exchanged: {
    sale: true,
    returnable: true,
    dispatchable: true,
    cancellable: false,
  },
});

// What the order's status means: its row in STATUSES.
export function statusOf(order: Order): Status {
  return STATUSES[order.status];
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
export class UnknownOrderError extends Error {
  override name = 'UnknownOrderError';
}

// Every order the store has placed, found by its number. main makes the
// store's one book and hands it to every part that keeps or finds orders.
export class OrderBook {
  readonly #orders: Order[] = [];
  readonly #byId: Map<string, Order> = new Map();

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
  *cursor(): Generator<Order> {
    let place = this.#orders.length;
    while (place > 0) {
      place -= 1;
      const order = this.#orders[place];
      if (order !== undefined) yield order;
    }
  }

  // What a for...of loop asks for: a new cursor, from the newest.
  [Symbol.iterator](): Generator<Order> {
    return this.cursor();
  }
}

// For tests only: order numbers from SF-00001 again.
export function reset(): void {
  lastOrderNumber = 0;
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
  dispatched: [order: Order];
};

// Who hears of what happens to an order, by the news's name: 'placed',
// 'refunded' or 'dispatched'. Node's EventEmitter keeps a list per name:
// subscribe with `on`, unsubscribe with `off`, notify with `emit`.
export class OrderEvents extends EventEmitter<OrderEventMap> {
  // Subscribe, and answer the way to cancel: whoever subscribes keeps it.
  subscribe(name: keyof OrderEventMap, listener: OrderListener): Cancel {
    this.on(name, listener);
    return () => {
      this.off(name, listener);
    };
  }
}

// Take the stock and keep the order in the book, then announce it.
export function placeOrder(
  order: Order,
  catalog: Catalog,
  book: OrderBook,
  events: OrderEvents,
): void {
  catalog.takeAllFromStock(order.lines);
  book.add(order);
  // The order is placed: now tell everyone subscribed at this moment.
  events.emit('placed', order);
}

// Mark an order dispatched: its parcel has left the warehouse with a
// courier. Then announce it.
export function dispatch(
  order: Order,
  parcel: Parcel,
  events: OrderEvents,
): void {
  order.markDispatched(parcel);
  events.emit('dispatched', order);
}
