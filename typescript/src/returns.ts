// Orders sent back, and the money that goes back with them.

import { formatMoney } from './money.ts';
import type { Order, OrderBook, OrderEvents } from './orders.ts';
import { refund, type Gateway, type PaymentDetails } from './payments.ts';
import type { Settings } from './settings.ts';
import { goodwillCents } from './support.ts';
import type { Mailer } from './vendor/mailer.ts';

// An order sent back. Its money goes back to the way to pay named to:
// the way the order was paid, unless the caller names another.
export class Return {
  readonly order: Order;
  readonly details: PaymentDetails;
  readonly gateway: Gateway;
  readonly to: string;
  // A goodwill credit gives back only part of the money, and the order is
  // not sent back.
  readonly cents: number | null;

  constructor(
    order: Order,
    details: PaymentDetails,
    gateway: Gateway,
    to: string = order.paymentMethod,
    cents: number | null = null,
  ) {
    this.order = order;
    this.details = details;
    this.gateway = gateway;
    this.to = to;
    this.cents = cents;
  }

  // Give the money back once, and mark the order returned.
  process(): string {
    let cents = this.cents;
    if (cents === null) {
      this.order.checkReturnable();
      cents = this.order.totalCents;
    }
    const refundId = refund(this.to, cents, this.details, this.gateway);
    if (this.cents === null) {
      this.order.markReturned();
    }
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

// One call that gives an order's money back, and tells the shopper.
// The return page builds it once with its parts and calls refund().
export class Refunds {
  readonly #parts: RefundParts;

  constructor(parts: RefundParts) {
    this.#parts = parts;
  }

  // Give an order's money back, tell the shopper, then announce it.
  // to, if given: the way to pay the money goes back to, as Return takes it.
  // reason, if given: what went wrong with the parcel, for a goodwill
  // credit.
  refund(
    orderId: string,
    details: PaymentDetails,
    to?: string,
    reason: string | null = null,
  ): string {
    const { gateway, mailer, shop, book, events } = this.#parts;
    const order = book.find(orderId);
    let cents: number | null = null;
    if (reason !== null) {
      cents = goodwillCents(order, reason);
    }
    const refundId = new Return(order, details, gateway, to, cents).process();
    let body: string;
    if (cents === null) {
      body =
        `Hi ${order.customerName}, we have refunded ` +
        `${formatMoney(order.totalCents, shop)}.`;
    } else {
      body =
        `Hi ${order.customerName}, sorry about your parcel: we have ` +
        `refunded ${formatMoney(cents, shop)}.`;
    }
    mailer.send({
      from: shop.storeEmail,
      to: order.customerEmail,
      subject: `${shop.storeName}: refund for ${order.orderId}`,
      body,
    });
    events.emit('refunded', order);
    return refundId;
  }
}
