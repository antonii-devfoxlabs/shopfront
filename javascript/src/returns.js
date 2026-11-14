// Orders sent back, and the money that goes back with them.

import { OrderBook, REFUNDED, formatMoney } from './orders.js';
import { payment } from './payments.js';

export class ReturnRefusedError extends Error {
  name = 'ReturnRefusedError';
}

// An order sent back. Its money goes back to the way to pay named to:
// the way the order was paid, unless the caller names another.
export class Return {
  constructor(order, details, gateway, to = order.paymentMethod) {
    this.order = order;
    this.details = details;
    this.gateway = gateway;
    this.to = to;
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
    return payment(this.to, this.details, this.gateway);
  }
}

// One call that gives an order's money back, and tells the shopper.
// The return page builds it once with its parts and calls refund().
export class Refunds {
  #parts;

  // The parts, by name: gateway, mailer, shop, and events: who hears of a
  // refund. main subscribes them.
  constructor(parts) {
    this.#parts = parts;
  }

  // Give an order's money back, tell the shopper, then announce it.
  // to, if given: the way to pay the money goes back to, as Return takes it.
  refund(orderId, details, to) {
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
    events.emit(REFUNDED, order);
    return refundId;
  }
}
