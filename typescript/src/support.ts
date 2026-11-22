// What the support team's page asks Shopfront.

import type { OrderBook, OrderEvents } from './orders.ts';
import type { PaymentDetails } from './payments.ts';
import { GOODWILL_PERCENT, type Refunds } from './returns.ts';

// The support page's answer to "where is my order?", from the store's
// order book.
export function whereIs(orderId: string, book: OrderBook): string {
  const order = book.find(orderId);
  const link = order.trackingLink();
  if (link === null) {
    return `${order.orderId} is ${order.status}`;
  }
  return `${order.orderId} is ${order.status}: ${link}`;
}

// The support page cancels an order the shopper no longer wants: the
// store will not send it, and no longer counts it as a sale. Then it
// announces it.
export function cancel(
  orderId: string,
  book: OrderBook,
  events: OrderEvents,
): void {
  const order = book.find(orderId);
  events.emit('beforeCancel', order);
  order.markCancelled();
  events.emit('cancelled', order);
}

// The support page gives part of the money back for a parcel that was
// late, arrived damaged or never arrived. The order stays as it is.
export function makeGood(
  orderId: string,
  reason: string,
  details: PaymentDetails,
  refunds: Refunds,
): string {
  return refunds.makeGood(orderId, reason, details);
}

// The lines the support page's goodwill form shows, one per reason the
// support team can pick.
export function goodwillChoices(): string[] {
  return [...GOODWILL_PERCENT].map(
    ([reason, percent]) => `${reason}: ${percent} % back`,
  );
}
