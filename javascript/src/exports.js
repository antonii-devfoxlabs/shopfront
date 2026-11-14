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

// The accountant's export: every sale, in one format. export is the
// routine, the same for every format. A subclass defines only write, the
// one step in which the formats differ.
export class OrderExport {
  export(orders) {
    const records = sales(orders).map(record);
    return this.write(records) + this.closing(records);
  }

  // The records as this format's text.
  write(records) {
    throw new Error('A subclass of OrderExport must define write()');
  }

  // The text after the records.
  closing(records) {
    throw new Error('A subclass of OrderExport must define closing()');
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

  closing(records) {
    // The bank checks the file: the number of sales and their sum.
    const cents = records
      .map((sale) => Number(sale.total.replace('.', '')))
      .reduce((sum, saleCents) => sum + saleCents, 0);
    const euros = Math.floor(cents / 100);
    const rest = String(cents % 100).padStart(2, '0');
    return `total,${records.length},,,${euros}.${rest}\n`;
  }
}

// A list of records: what the bookkeeping app reads.
export class JsonExport extends OrderExport {
  write(records) {
    return JSON.stringify(records, null, 2) + '\n';
  }

  closing() {
    return '';
  }
}

function byOrderId(first, second) {
  if (first.orderId < second.orderId) return -1;
  return first.orderId > second.orderId ? 1 : 0;
}
