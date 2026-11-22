// What the support team's page asks Shopfront.

import * as services from './services.js';

// The support page's answer to "where is my order?".
export function whereIs(orderId) {
  const order = services.get('order_book').find(orderId);
  const link = order.trackingLink();
  if (link === null) {
    return `${order.orderId} is ${order.status}`;
  }
  return `${order.orderId} is ${order.status}: ${link}`;
}
