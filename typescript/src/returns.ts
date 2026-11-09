// Orders sent back, and the money that goes back with them.

import type { Order } from './orders.ts';
import {
  payment,
  type PaymentDetails,
  type PaymentMethod,
} from './payments.ts';

export class ReturnRefusedError extends Error {
  override name = 'ReturnRefusedError';
}

export class UnsupportedReturnError extends Error {
  override name = 'UnsupportedReturnError';
}

// The shopper who paid sends the order back.
export class Return {
  readonly order: Order;
  readonly details: PaymentDetails;

  constructor(order: Order, details: PaymentDetails) {
    this.order = order;
    this.details = details;
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
    return payment(this.order.paymentMethod, this.details);
  }
}

// The person who got the order as a gift sends it back.
export class GiftReturn extends Return {
  override destination(): PaymentMethod {
    return payment('gift_card', this.details);
  }
}

const RETURNS = new Map<string, typeof Return>([
  ['standard', Return],
  ['gift', GiftReturn],
]);

// Create the return that the kind's name stands for.
export function returnFor(
  kind: string,
  order: Order,
  details: PaymentDetails,
): Return {
  const ReturnClass = RETURNS.get(kind);
  if (ReturnClass === undefined) {
    throw new UnsupportedReturnError(kind);
  }
  return new ReturnClass(order, details);
}
