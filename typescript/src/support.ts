// What the support team's page asks Shopfront.

import { statusOf, type Order, type OrderBook } from './orders.ts';
import type { PaymentDetails } from './payments.ts';
import type { Refunds } from './returns.ts';

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
// store will not send it, and no longer counts it as a sale.
export function cancel(orderId: string, book: OrderBook): void {
  book.find(orderId).markCancelled();
}

export class GoodwillRefusedError extends Error {
  override name = 'GoodwillRefusedError';
}

// The part of an order's total the support team gives back, in percent,
// by what went wrong with the parcel.
const GOODWILL_PERCENT = new Map<string, number>([
  ['late', 10],
  ['damaged', 50],
]);

// What the store gives back for a parcel that went wrong: only for an
// order that has left, and is still a sale.
export function goodwillCents(order: Order, reason: string): number {
  if (order.parcel === null || !statusOf(order).sale) {
    throw new GoodwillRefusedError(`${order.orderId} is ${order.status}`);
  }
  const percent = GOODWILL_PERCENT.get(reason);
  if (percent === undefined) {
    throw new GoodwillRefusedError(`no goodwill for ${reason}`);
  }
  return Math.floor((order.totalCents * percent) / 100);
}

// The support page gives part of the money back for a parcel that was
// late or arrived damaged. The order stays as it is.
export function makeGood(
  orderId: string,
  reason: string,
  details: PaymentDetails,
  refunds: Refunds,
): string {
  return refunds.makeGood(orderId, reason, details);
}
