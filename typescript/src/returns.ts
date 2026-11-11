// Orders sent back, and the money that goes back with them.

import { type Order, OrderBook, formatMoney } from './orders.ts';
import {
  payment,
  type Gateway,
  type PaymentDetails,
  type PaymentMethod,
} from './payments.ts';
import type { Settings } from './settings.ts';
import type { Mailer } from './vendor/mailer.ts';

export class ReturnRefusedError extends Error {
  override name = 'ReturnRefusedError';
}

// The shopper who paid sends the order back.
export class Return {
  readonly order: Order;
  readonly details: PaymentDetails;
  readonly gateway: Gateway;

  constructor(order: Order, details: PaymentDetails, gateway: Gateway) {
    this.order = order;
    this.details = details;
    this.gateway = gateway;
  }

  // Give the money back once, and mark the order returned.
  process(): string {
    if (this.order.status !== 'placed') {
      throw new ReturnRefusedError(
        `${this.order.orderId} is ${this.order.status}`,
      );
    }
    const refundId = this.destination().refund(this.order.totalCents);
    this.order.status = 'returned';
    return refundId;
  }

  // Create the way to pay that the money goes back to.
  destination(): PaymentMethod {
    return payment(this.order.paymentMethod, this.details, this.gateway);
  }
}

// The person who got the order as a gift sends it back.
export class GiftReturn extends Return {
  override destination(): PaymentMethod {
    return payment('gift_card', this.details, this.gateway);
  }
}

// The parts main hands the refunds once.
export type RefundParts = {
  gateway: Gateway;
  mailer: Mailer;
  shop: Settings;
};

// One call that gives an order's money back, and tells the shopper.
// The return page builds it once with its parts and calls refund().
export class Refunds {
  readonly #parts: RefundParts;

  constructor(parts: RefundParts) {
    this.#parts = parts;
  }

  // Give an order's money back, and tell the shopper.
  refund(orderId: string, details: PaymentDetails): string {
    const { gateway, mailer, shop } = this.#parts;
    const order = OrderBook.instance().find(orderId);
    const refundId = new Return(order, details, gateway).process();
    mailer.send({
      from: shop.storeEmail,
      to: order.customerEmail,
      subject: `${shop.storeName}: refund for ${order.orderId}`,
      body:
        `Hi ${order.customerName}, we have refunded ` +
        `${formatMoney(order.totalCents, shop)}.`,
    });
    return refundId;
  }
}
