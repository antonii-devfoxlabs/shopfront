// An order, and what happens once it is placed.

import type { Catalog } from './catalog.ts';
import { settings } from './settings.ts';
import type { Analytics } from './vendor/analytics.ts';
import type { Mailer } from './vendor/mailer.ts';

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

const FREE_SAMPLE = 'TEA-SAMPLE';
const FREE_SAMPLE_FROM_CENTS = 4_000;

// What goes into the parcel, one line per product.
export function packingSlip(order: Order): string[] {
  const slip = [...order.lines].map(
    ([sku, quantity]) => `${quantity} x ${sku}`,
  );
  if (order.totalCents >= FREE_SAMPLE_FROM_CENTS) {
    slip.push(`1 x ${FREE_SAMPLE}`);
  }
  return slip;
}

export function placeOrder(
  order: Order,
  catalog: Catalog,
  mailer: Mailer,
  analytics: Analytics,
): void {
  catalog.takeAllFromStock(order.lines);
  mailer.send({
    from: settings.storeEmail,
    to: order.customerEmail,
    subject: `${settings.storeName}: order ${order.orderId}`,
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

export function formatMoney(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const euros = Math.floor(Math.abs(cents) / 100);
  const rest = String(Math.abs(cents) % 100).padStart(2, '0');
  return `${sign}${euros}.${rest} ${settings.currency}`;
}
