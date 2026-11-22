// What the support team's page asks Shopfront.

import { statusOf } from './orders.js';

export class CancelRefusedError extends Error {
  name = 'CancelRefusedError';
}

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
  const order = book.find(orderId);
  if (!statusOf(order).returnable) {
    throw new CancelRefusedError(`${order.orderId} is ${order.status}`);
  }
  order.status = 'cancelled';
}
