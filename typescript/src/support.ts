// What the support team's page asks Shopfront.

import type { OrderBook } from './orders.ts';
import * as services from './services.ts';

// The support page's answer to "where is my order?".
export function whereIs(orderId: string): string {
  const order = services.get<OrderBook>('order_book').find(orderId);
  const link = order.trackingLink();
  if (link === null) {
    return `${order.orderId} is ${order.status}`;
  }
  return `${order.orderId} is ${order.status}: ${link}`;
}
