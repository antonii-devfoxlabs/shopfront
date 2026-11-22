// What the support team's page asks Shopfront.

import { CANCELLED } from './orders.js';
import { GOODWILL_PERCENT } from './returns.js';

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
// store will not send it, and no longer counts it as a sale. Then it
// announces it.
export function cancel(orderId, book, events) {
  const order = book.find(orderId);
  order.markCancelled();
  events.emit(CANCELLED, order);
}

/**
 * The support page gives part of the money back for a parcel that was
 * late, arrived damaged or never arrived. The order stays as it is.
 * @param {import('./returns.js').Refunds} refunds
 */
export function makeGood(orderId, reason, details, refunds) {
  return refunds.makeGood(orderId, reason, details);
}

// The lines the support page's goodwill form shows, one per reason the
// support team can pick.
export function goodwillChoices() {
  return [...GOODWILL_PERCENT].map(
    ([reason, percent]) => `${reason}: ${percent} % back`,
  );
}
