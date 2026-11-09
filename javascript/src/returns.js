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
    const refundId = this.destination().refund(this.order.totalCents);
    this.order.status = 'returned';
    return refundId;
  }

  // Create the way to pay that the money goes back to.
  destination() {
    return payment(this.order.paymentMethod, this.details);
  }
}

// The person who got the order as a gift sends it back.
export class GiftReturn extends Return {
  destination() {
    return payment('gift_card', this.details);
  }
}
