// Orders exported for the accountant: as CSV, and as JSON.

import type { Order } from './orders.ts';

export function exportCsv(orders: Order[]): string {
  const rows = ['order_id,email,country,payment,total'];
  const sorted = [...orders].sort(byOrderId);
  for (const order of sorted) {
    // Only placed orders are sales: a returned one gave its money back.
    if (order.status !== 'placed') continue;
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

export function exportJson(orders: Order[]): string {
  const records: Record<string, string>[] = [];
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

function byOrderId(first: Order, second: Order): number {
  if (first.orderId < second.orderId) return -1;
  return first.orderId > second.orderId ? 1 : 0;
}
