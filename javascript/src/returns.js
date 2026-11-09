// Orders sent back, and the money that goes back with them.

import { OrderBook } from './orders.js';
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

// Send back an order that the shopper names by its number.
export function returnOrder(orderId, details, gateway) {
  const order = OrderBook.instance().find(orderId);
  return new Return(order, details, gateway).process();
}
