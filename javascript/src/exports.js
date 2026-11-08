// Orders exported for the accountant: as CSV, and as JSON.

export function exportCsv(orders) {
  const rows = ['order_id,email,country,payment,total'];
  const sorted = [...orders].sort(byOrderId);
  for (const order of sorted) {
    if (order.status === 'cancelled') continue;
    const euros = Math.floor(order.totalCents / 100);
    const cents = String(order.totalCents % 100).padStart(2, '0');
    const total = `${euros}.${cents}`;
    rows.push(
      `${order.orderId},${order.customerEmail},` +
        `${order.shippingCountry},${order.paymentMethod},${total}`,
    );
  }
  return rows.join('\n') + '\n';
}

export function exportJson(orders) {
  const records = [];
  const sorted = [...orders].sort(byOrderId);
  for (const order of sorted) {
    if (order.status === 'cancelled') continue;
    const euros = Math.floor(order.totalCents / 100);
    const cents = String(order.totalCents % 100).padStart(2, '0');
    const total = `${euros}.${cents}`;
    records.push({
      order_id: order.orderId,
      email: order.customerEmail,
      country: order.shippingCountry,
      payment: order.paymentMethod,
      total,
    });
  }
  return JSON.stringify(records, null, 2) + '\n';
}

function byOrderId(first, second) {
  if (first.orderId < second.orderId) return -1;
  return first.orderId > second.orderId ? 1 : 0;
}
