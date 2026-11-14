// Orders exported for the accountant: as CSV, and as JSON.

const COLUMNS = ['order_id', 'email', 'country', 'payment', 'total'];

// The orders the accountant counts as sales, oldest first.
export function sales(orders) {
  // Only placed orders are sales: a returned one gave its money back.
  return orders.filter((order) => order.status === 'placed').sort(byOrderId);
}

// An amount in cents as euros, the way the files write it: 19.05.
export function euros(cents) {
  const whole = Math.floor(cents / 100);
  const rest = String(cents % 100).padStart(2, '0');
  return `${whole}.${rest}`;
}

// One sale as the accountant's fields, named as in COLUMNS.
export function record(order) {
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
export class OrderExport {
  export(orders) {
    const sold = this.pick(orders);
    const records = sold.map(record);
    return this.write(records) + this.closing(sold);
  }

  // The orders this file lists: the sales, unless a file says.
  pick(orders) {
    return sales(orders);
  }

  // The records as this format's text.
  write(records) {
    throw new Error('A subclass of OrderExport must define write()');
  }

  // The text after the records: none, unless a format adds some.
  closing(sold) {
    return '';
  }
}

// A header row, then a row per sale: what a spreadsheet opens.
export class CsvExport extends OrderExport {
  write(records) {
    const rows = [COLUMNS.join(',')];
    for (const sale of records) {
      rows.push(COLUMNS.map((column) => sale[column]).join(','));
    }
    return rows.join('\n') + '\n';
  }

  closing(sold) {
    // The bank checks the file: the number of sales and their sum.
    const total = sold.reduce((sum, order) => sum + order.totalCents, 0);
    return `total,${sold.length},,,${euros(total)}\n`;
  }
}

// A list of records: what the bookkeeping app reads.
export class JsonExport extends OrderExport {
  write(records) {
    return JSON.stringify(records, null, 2) + '\n';
  }
}

// The month's returns as CSV: the bank checks the refunds it paid.
export class ReturnsCsvExport extends CsvExport {
  pick(orders) {
    return orders
      .filter((order) => order.status === 'returned')
      .sort(byOrderId);
  }
}

// The month's returns as JSON: the bookkeeping app books refunds.
export class ReturnsJsonExport extends JsonExport {
  pick(orders) {
    return orders
      .filter((order) => order.status === 'returned')
      .sort(byOrderId);
  }
}

function byOrderId(first, second) {
  if (first.orderId < second.orderId) return -1;
  return first.orderId > second.orderId ? 1 : 0;
}
