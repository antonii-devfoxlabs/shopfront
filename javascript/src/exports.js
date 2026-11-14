// Orders exported for the accountant: as CSV, and as JSON.

const COLUMNS = ['order_id', 'email', 'country', 'payment', 'total'];

// The orders the accountant counts as sales, oldest first.
export function sales(orders) {
  // Only placed orders are sales: a returned one gave its money back.
  return orders.filter((order) => order.status === 'placed').sort(byOrderId);
}

// One sale as the accountant's fields, named as in COLUMNS.
export function record(order) {
  const euros = Math.floor(order.totalCents / 100);
  const cents = String(order.totalCents % 100).padStart(2, '0');
  return {
    order_id: order.orderId,
    email: order.customerEmail,
    country: order.shippingCountry,
    payment: order.paymentMethod,
    total: `${euros}.${cents}`,
  };
}

export function exportCsv(orders) {
  const records = sales(orders).map(record);
  const rows = [COLUMNS.join(',')];
  for (const sale of records) {
    rows.push(COLUMNS.map((column) => sale[column]).join(','));
  }
  return rows.join('\n') + '\n';
}

export function exportJson(orders) {
  const records = sales(orders).map(record);
  return JSON.stringify(records, null, 2) + '\n';
}

function byOrderId(first, second) {
  if (first.orderId < second.orderId) return -1;
  return first.orderId > second.orderId ? 1 : 0;
}
