// Orders exported for the accountant: as CSV, and as JSON.

const COLUMNS = ['order_id', 'email', 'country', 'payment', 'total'];

/**
 * Which orders a file lists fills this slot: a function of all the
 * orders that answers the ones to list, as sales and returns do.
 * @callback Selection
 * @param {import('./orders.js').Order[]} orders
 * @returns {import('./orders.js').Order[]}
 */

// The orders the accountant counts as sales, oldest first.
export function sales(orders) {
  // Only placed orders are sales: a returned one gave its money back.
  return orders.filter((order) => order.status === 'placed').sort(byOrderId);
}

// The orders the shoppers sent back, oldest first.
export function returns(orders) {
  return orders
    .filter((order) => order.status === 'returned')
    .sort(byOrderId);
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

// The accountant's export: the orders a file lists, in one format.
// export is the routine, the same for every file. It is handed pick,
// which orders the file lists, when it is made. A subclass must define
// write, the step in which the formats differ, and may define closing, a
// hook that adds nothing unless a format has a closing line.
export class OrderExport {
  #pick;

  /** @param {Selection} pick */
  constructor(pick) {
    this.#pick = pick;
  }

  export(orders) {
    const listed = this.#pick(orders);
    const records = listed.map(record);
    return this.write(records) + this.closing(listed);
  }

  // The records as this format's text.
  write(records) {
    throw new Error('A subclass of OrderExport must define write()');
  }

  // The text after the records: none, unless a format adds some.
  closing(listed) {
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

  closing(listed) {
    // The bank checks the file: the number of orders and their sum.
    const total = listed.reduce((sum, order) => sum + order.totalCents, 0);
    return `total,${listed.length},,,${euros(total)}\n`;
  }
}

// A list of records: what the bookkeeping app reads.
export class JsonExport extends OrderExport {
  write(records) {
    return JSON.stringify(records, null, 2) + '\n';
  }
}

function byOrderId(first, second) {
  if (first.orderId < second.orderId) return -1;
  return first.orderId > second.orderId ? 1 : 0;
}
