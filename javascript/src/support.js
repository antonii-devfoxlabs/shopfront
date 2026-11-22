// What the support team's page asks Shopfront.

import { statusOf } from './orders.js';

// The support page's answer to "where is my order?", from the store's
// order book.
export function whereIs(orderId, book) {
  const order = book.find(orderId);
  const link = order.trackingLink();
  if (link === null) {
    return `${order.orderId} is ${order.status}`;
  }
  return `${order.orderId} is ${order.status}: ${link}`;
}

// The support page cancels an order the shopper no longer wants: the
// store will not send it, and no longer counts it as a sale.
export function cancel(orderId, book) {
  book.find(orderId).markCancelled();
}

export class GoodwillRefusedError extends Error {
  name = 'GoodwillRefusedError';
}

// The part of an order's total the support team gives back, in percent,
// by what went wrong with the parcel.
const GOODWILL_PERCENT = new Map([
  ['late', 10],
  ['damaged', 50],
]);

// What the store gives back for a parcel that went wrong: only for an
// order that has left, and is still a sale.
export function goodwillCents(order, reason) {
  if (order.parcel === null || !statusOf(order).sale) {
    throw new GoodwillRefusedError(`${order.orderId} is ${order.status}`);
  }
  const percent = GOODWILL_PERCENT.get(reason);
  if (percent === undefined) {
    throw new GoodwillRefusedError(`no goodwill for ${reason}`);
  }
  return Math.floor((order.totalCents * percent) / 100);
}

/**
 * The support page gives part of the money back for a parcel that was
 * late or arrived damaged. The order stays as it is.
 * @param {import('./returns.js').Refunds} refunds
 */
export function makeGood(orderId, reason, details, refunds) {
  return refunds.refund(orderId, details, undefined, reason);
}
