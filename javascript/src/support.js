// What the support team's page asks Shopfront.

import { OrderBook } from './orders.js';

// The support page's answer to "where is my order?".
export function whereIs(orderId) {
  const order = OrderBook.instance().find(orderId);
  const link = order.trackingLink();
  if (link === null) {
    return `${order.orderId} is ${order.status}`;
  }
  return `${order.orderId} is ${order.status}: ${link}`;
}
