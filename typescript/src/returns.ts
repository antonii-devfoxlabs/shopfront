// Orders sent back, and the money that goes back with them.

import type { Order } from './orders.ts';
import { payment, type PaymentDetails } from './payments.ts';

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
    const destination = payment(this.order.paymentMethod, this.details);
    const refundId = destination.refund(this.order.totalCents);
    this.order.status = 'returned';
    return refundId;
  }
}

// The person who got the order as a gift sends it back.
export class GiftReturn extends Return {
  // Give the money back and mark the order returned.
  override process(): string {
    const destination = payment('gift_card', this.details);
    const refundId = destination.refund(this.order.totalCents);
    this.order.status = 'returned';
    return refundId;
  }
}
