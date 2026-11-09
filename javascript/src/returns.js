// Orders sent back, and the money that goes back with them.

import { payment } from './payments.js';

// The shopper who paid sends the order back.
export class Return {
  constructor(order, details) {
    this.order = order;
    this.details = details;
  }

  // Give the money back and mark the order returned.
  process() {
    const destination = payment(this.order.paymentMethod, this.details);
    const refundId = destination.refund(this.order.totalCents);
    this.order.status = 'returned';
    return refundId;
  }
}

// The person who got the order as a gift sends it back.
export class GiftReturn extends Return {
  // Give the money back and mark the order returned.
  process() {
    const destination = payment('gift_card', this.details);
    const refundId = destination.refund(this.order.totalCents);
    this.order.status = 'returned';
    return refundId;
  }
}
