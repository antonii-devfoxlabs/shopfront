// Orders sent back, and the money that goes back with them.

import { OrderBook, formatMoney } from './orders.js';
import { payment } from './payments.js';

export class ReturnRefusedError extends Error {
  name = 'ReturnRefusedError';
}

// The shopper who paid sends the order back.
export class Return {
  constructor(order, details, gateway) {
    this.order = order;
    this.details = details;
    this.gateway = gateway;
  }

  // Give the money back once, and mark the order returned.
  process() {
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
  destination() {
    return payment(this.order.paymentMethod, this.details, this.gateway);
  }
}

// The person who got the order as a gift sends it back.
export class GiftReturn extends Return {
  destination() {
    return payment('gift_card', this.details, this.gateway);
  }
}

// One call that gives an order's money back, and tells the shopper.
// main hands it the parts once; the return page calls refund().
export class Refunds {
  #parts;

  // The parts, by name: gateway, mailer, shop, and events: who hears of a
  // refund. main subscribes them.
  constructor(parts) {
    this.#parts = parts;
  }

  // Give an order's money back, tell the shopper, then announce it.
  refund(orderId, details) {
    const { gateway, mailer, shop, events } = this.#parts;
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
    events.notify('refunded', order);
    return refundId;
  }
}
