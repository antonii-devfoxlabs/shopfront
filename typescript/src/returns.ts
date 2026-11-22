// Orders sent back, and the money that goes back with them.

import { formatMoney } from './money.ts';
import {
  type Order,
  OrderBook,
  type OrderEvents,
  statusOf,
} from './orders.ts';
import { refund, type Gateway, type PaymentDetails } from './payments.ts';
import type { Settings } from './settings.ts';
import type { Mailer } from './vendor/mailer.ts';

export class ReturnRefusedError extends Error {
  override name = 'ReturnRefusedError';
}

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
    if (!statusOf(this.order).returnable) {
      throw new ReturnRefusedError(
        `${this.order.orderId} is ${this.order.status}`,
      );
    }
    const refundId = refund(
      this.to,
      this.order.totalCents,
      this.details,
      this.gateway,
    );
    this.order.status = 'returned';
    return refundId;
  }
}

// A product sent back and the same one sent again: no money moves.
export class Exchange extends Return {
  constructor(order: Order, gateway: Gateway) {
    super(order, {}, gateway);
  }

  // Take the product back and mark the order returned: no refund.
  override process(): string {
    if (!statusOf(this.order).returnable) {
      throw new ReturnRefusedError(
        `${this.order.orderId} is ${this.order.status}`,
      );
    }
    this.order.status = 'returned';
    return '';
  }
}

// The parts main hands the refunds once.
export type RefundParts = {
  gateway: Gateway;
  mailer: Mailer;
  shop: Settings;
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
  refund(orderId: string, details: PaymentDetails, to?: string): string {
    const { gateway, mailer, shop, events } = this.#parts;
    const order = OrderBook.instance().find(orderId);
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
}
