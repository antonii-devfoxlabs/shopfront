// Orders exported for the accountant: as CSV, and as JSON.

import type { Order } from './orders.ts';

const COLUMNS = ['order_id', 'email', 'country', 'payment', 'total'];

// The orders the accountant counts as sales, oldest first.
export function sales(orders: Order[]): Order[] {
  // Only placed orders are sales: a returned one gave its money back.
  return orders.filter((order) => order.status === 'placed').sort(byOrderId);
}

// One sale as the accountant's fields, named as in COLUMNS.
export function record(order: Order): Record<string, string> {
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

// The accountant's export: every sale, in one format. export is the
// routine, the same for every format. A subclass must define write, the
// step in which the formats differ, and may define closing, a hook that
// adds nothing unless a format has a closing line.
export abstract class OrderExport {
  export(orders: Order[]): string {
    const records = sales(orders).map(record);
    return this.write(records) + this.closing(records);
  }

  // The records as this format's text.
  protected abstract write(records: Record<string, string>[]): string;

  // The text after the records: none, unless a format adds some.
  protected closing(records: Record<string, string>[]): string {
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

  protected override closing(records: Record<string, string>[]): string {
    // The bank checks the file: the number of sales and their sum.
    const cents = records
      .map((sale) => Number(String(sale['total']).replace('.', '')))
      .reduce((sum, saleCents) => sum + saleCents, 0);
    const euros = Math.floor(cents / 100);
    const rest = String(cents % 100).padStart(2, '0');
    return `total,${records.length},,,${euros}.${rest}\n`;
  }
}

// A list of records: what the bookkeeping app reads.
export class JsonExport extends OrderExport {
  protected override write(records: Record<string, string>[]): string {
    return JSON.stringify(records, null, 2) + '\n';
  }
}

function byOrderId(first: Order, second: Order): number {
  if (first.orderId < second.orderId) return -1;
  return first.orderId > second.orderId ? 1 : 0;
}
