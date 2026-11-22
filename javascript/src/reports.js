// The owner's Monday line, from the orders the shop has kept.

import { formatMoney } from './money.js';
import { statusOf } from './orders.js';

// The owner's Monday line: the orders kept, what they took, and the
// average order, rounded down to the cent.
export function salesReport(orders, shop) {
  let count = 0;
  let takings = 0;
  for (const order of orders) {
    if (!statusOf(order).sale) continue;
    count += 1;
    takings += order.totalCents;
  }
  const average = count === 0 ? 0 : Math.floor(takings / count);
  return (
    `Orders: ${count}, takings: ${formatMoney(takings, shop)}, ` +
    `average: ${formatMoney(average, shop)}`
  );
}
