// Orders exported for the accountant: as CSV, and as JSON.

import type { Order } from './orders.ts';

const COLUMNS = ['order_id', 'email', 'country', 'payment', 'total'];

// The orders the accountant counts as sales, oldest first.
export function sales(orders: Order[]): Order[] {
  // Only placed orders are sales: a returned one gave its money back.
  return orders.filter((order) => order.status === 'placed').sort(byOrderId);
}

// An amount in cents as euros, the way the files write it: 19.05.
export function euros(cents: number): string {
  const whole = Math.floor(cents / 100);
  const rest = String(cents % 100).padStart(2, '0');
  return `${whole}.${rest}`;
}

// One sale as the accountant's fields, named as in COLUMNS.
export function record(order: Order): Record<string, string> {
  return {
    order_id: order.orderId,
    email: order.customerEmail,
    country: order.shippingCountry,
    payment: order.paymentMethod,
    total: euros(order.totalCents),
  };
}

// The accountant's export: every sale, in one format. export is the
// routine, the same for every format. A subclass must define write, the
// step in which the formats differ, and may define closing, a hook that
// adds nothing unless a format has a closing line, and pick, a hook that
// picks the sales unless a file lists others.
export abstract class OrderExport {
  export(orders: Order[]): string {
    const sold = this.pick(orders);
    const records = sold.map(record);
    return this.write(records) + this.closing(sold);
  }

  // The orders this file lists: the sales, unless a file says.
  protected pick(orders: Order[]): Order[] {
    return sales(orders);
  }

  // The records as this format's text.
  protected abstract write(records: Record<string, string>[]): string;

  // The text after the records: none, unless a format adds some.
  protected closing(sold: Order[]): string {
    return '';
  }
}

// A header row, then a row per sale: what a spreadsheet opens.
export class CsvExport extends OrderExport {
  protected override write(records: Record<string, string>[]): string {
    const rows = [COLUMNS.join(',')];
    for (const sale of records) {
      rows.push(COLUMNS.map((column) => sale[column]).join(','));
    }
    return rows.join('\n') + '\n';
  }

  protected override closing(sold: Order[]): string {
    // The bank checks the file: the number of sales and their sum.
    const total = sold.reduce((sum, order) => sum + order.totalCents, 0);
    return `total,${sold.length},,,${euros(total)}\n`;
  }
}

// A list of records: what the bookkeeping app reads.
export class JsonExport extends OrderExport {
  protected override write(records: Record<string, string>[]): string {
    return JSON.stringify(records, null, 2) + '\n';
  }
}

// The month's returns as CSV: the bank checks the refunds it paid.
export class ReturnsCsvExport extends CsvExport {
  protected override pick(orders: Order[]): Order[] {
    return orders
      .filter((order) => order.status === 'returned')
      .sort(byOrderId);
  }
}

// The month's returns as JSON: the bookkeeping app books refunds.
export class ReturnsJsonExport extends JsonExport {
  protected override pick(orders: Order[]): Order[] {
    return orders
      .filter((order) => order.status === 'returned')
      .sort(byOrderId);
  }
}

function byOrderId(first: Order, second: Order): number {
  if (first.orderId < second.orderId) return -1;
  return first.orderId > second.orderId ? 1 : 0;
}
