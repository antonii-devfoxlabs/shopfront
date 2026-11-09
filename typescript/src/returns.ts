// Orders sent back, and the money that goes back with them.

import type { Order } from './orders.ts';
import {
  payment,
  type PaymentDetails,
  type PaymentMethod,
} from './payments.ts';

// The shopper who paid sends the order back.
export class Return {
  readonly order: Order;
  readonly details: PaymentDetails;

  constructor(order: Order, details: PaymentDetails) {
    this.order = order;
    this.details = details;
  }

  // Give the money back and mark the order returned.
  process(): string {
    const refundId = this.destination().refund(this.order.totalCents);
    this.order.status = 'returned';
    return refundId;
  }

  // Create the way to pay that the money goes back to.
  destination(): PaymentMethod {
    return payment(this.order.paymentMethod, this.details);
  }
}

// The person who got the order as a gift sends it back.
export class GiftReturn extends Return {
  override destination(): PaymentMethod {
    return payment('gift_card', this.details);
  }
}
