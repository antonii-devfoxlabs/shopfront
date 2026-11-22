// What the support team's page asks Shopfront.

import type { OrderBook } from './orders.ts';

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
