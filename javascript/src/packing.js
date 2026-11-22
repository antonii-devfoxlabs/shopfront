// What the warehouse puts into the parcel of an order.

const SAMPLE = 'TEA-SAMPLE';
const SAMPLE_FROM_CENTS = 4_000;

// What goes into the parcel, one line per product, in SKU order: the order
// the shelves are in, so the warehouse walks them once.
export function packingSlip(order) {
  const slip = [...order.lines]
    .sort(([first], [second]) => (first < second ? -1 : 1))
    .map(([sku, quantity]) => `${quantity} x ${sku}`);
  if (order.totalCents >= SAMPLE_FROM_CENTS) {
    slip.push(`1 x ${SAMPLE}`);
  }
  return slip;
}
