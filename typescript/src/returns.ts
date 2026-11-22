// Orders sent back, and the money that goes back with them.

import { formatMoney } from './money.ts';
import {
  statusOf,
  type Order,
  type OrderBook,
  type OrderEvents,
} from './orders.ts';
import { refund, type Gateway, type PaymentDetails } from './payments.ts';
import type { Settings } from './settings.ts';
import type { Mailer } from './vendor/mailer.ts';

// An order sent back. Its money goes back to the way to pay named to:
// the way the order was paid, unless the caller names another.
export class Return {
  readonly order: Order;
  readonly details: PaymentDetails;
  readonly gateway: Gateway;
  readonly to: string;

  constructor(
    order: Order,
    details: PaymentDetails,
    gateway: Gateway,
    to: string = order.paymentMethod,
  ) {
    this.order = order;
    this.details = details;
    this.gateway = gateway;
    this.to = to;
  }

  // Give the money back once, and mark the order returned.
  process(): string {
    this.order.checkReturnable();
    const refundId = refund(
      this.to,
      this.order.totalCents,
      this.details,
      this.gateway,
    );
    this.order.markReturned();
    return refundId;
  }
}

// A product sent back and the same one sent again: the sale stands, and
// no money moves, so an exchange is not a Return.
export class Exchange {
  readonly order: Order;

  constructor(order: Order) {
    this.order = order;
  }

  // Take the product back, and mark the order exchanged.
  process(): void {
    this.order.markExchanged();
  }
}

export class GoodwillRefusedError extends Error {
  override name = 'GoodwillRefusedError';
}

// A reason to refuse a goodwill credit: check throws, or passes.
export interface GoodwillCheck {
  check(order: Order): void;
}

export class HasLeft implements GoodwillCheck {
  check(order: Order): void {
    if (order.parcel === null) {
      throw new GoodwillRefusedError(`${order.orderId} is ${order.status}`);
    }
  }
}

export class StillASale implements GoodwillCheck {
  check(order: Order): void {
    if (!statusOf(order).sale) {
      throw new GoodwillRefusedError(`${order.orderId} is ${order.status}`);
    }
  }
}

// The part of an order's total the support team gives back, in percent,
// by what went wrong with the parcel.
export const GOODWILL_PERCENT: ReadonlyMap<string, number> = new Map([
  ['late', 10],
  ['damaged', 50],
  ['lost', 100],
]);

// The checks every goodwill credit must pass, in this order.
export const GOODWILL_CHECKS: GoodwillCheck[] = [
  new HasLeft(),
  new StillASale(),
];

// What the store gives back for a parcel that went wrong: only for an
// order that has left, and is still a sale.
export function goodwillCents(order: Order, reason: string): number {
  for (const goodwillCheck of GOODWILL_CHECKS) {
    goodwillCheck.check(order);
  }
  const percent = GOODWILL_PERCENT.get(reason);
  if (percent === undefined) {
    throw new GoodwillRefusedError(`no goodwill for ${reason}`);
  }
  return Math.floor((order.totalCents * percent) / 100);
}

// The parts main hands the refunds once.
export type RefundParts = {
  gateway: Gateway;
  mailer: Mailer;
  shop: Settings;
  // The store's one order book, where the order is found.
  book: OrderBook;
  // Who hears of a refund: main subscribes them.
  events: OrderEvents;
};

// The calls that give an order's money back, and tell the shopper.
// The return page builds it once with its parts and calls refund(); the
// support page calls makeGood().
export class Refunds {
  readonly #parts: RefundParts;

  constructor(parts: RefundParts) {
    this.#parts = parts;
  }

  // Give an order's money back, tell the shopper, then announce it.
  // to, if given: the way to pay the money goes back to, as Return takes it.
  refund(orderId: string, details: PaymentDetails, to?: string): string {
    const { gateway, mailer, shop, book, events } = this.#parts;
    const order = book.find(orderId);
    const refundId = new Return(order, details, gateway, to).process();
    mailer.send({
      from: shop.storeEmail,
      to: order.customerEmail,
      subject: `${shop.storeName}: refund for ${order.orderId}`,
      body:
        `Hi ${order.customerName}, we have refunded ` +
        `${formatMoney(order.totalCents, shop)}.`,
    });
    events.emit('refunded', order);
    return refundId;
  }

  // Give part of an order's money back for a parcel that went wrong, and
  // tell the shopper. The order stays as it is, and nothing is announced:
  // nothing comes back to the warehouse.
  makeGood(orderId: string, reason: string, details: PaymentDetails): string {
    const { gateway, mailer, shop, book } = this.#parts;
    const order = book.find(orderId);
    const cents = goodwillCents(order, reason);
    const refundId = refund(order.paymentMethod, cents, details, gateway);
    mailer.send({
      from: shop.storeEmail,
      to: order.customerEmail,
      subject: `${shop.storeName}: refund for ${order.orderId}`,
      body:
        `Hi ${order.customerName}, sorry about your parcel: we have ` +
        `refunded ${formatMoney(cents, shop)}.`,
    });
    return refundId;
  }
}
