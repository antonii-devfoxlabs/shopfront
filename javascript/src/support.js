// What the support team's page asks Shopfront.

import { OrderBook } from './orders.js';

// The support page's answer to "where is my order?".
export function whereIs(orderId) {
  const order = OrderBook.instance().find(orderId);
  if (order.parcel === null) {
    return `${order.orderId} is ${order.status}`;
  }
  return (
    `${order.orderId} is ${order.status}: ` +
    `${order.parcel.courier.trackingPage}${order.parcel.number}`
  );
}
