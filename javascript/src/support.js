// What the support team's page asks Shopfront.

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
