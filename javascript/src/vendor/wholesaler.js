// The wholesaler's SDK: the products it sells, a hundred per request.
// A real one answers over the network, so every request takes a moment;
// this one waits 10 ms to show it, and `requests` counts them. It keeps
// its products in SKU order and answers the hundred after the SKU it is
// given, so a caller can start anywhere.

export const PAGE_SIZE = 100;
const ANSWER_MILLISECONDS = 10;
const KINDS = [
  ['Enamel mug', 1_250, 350, 40],
  ['Green tea, 100 g', 890, 120, 120],
  ['Pour-over kettle', 4_900, 1_100, 8],
  ['Glass cup, set of two', 2_400, 600, 25],
  ['Paper filters, 100', 450, 90, 200],
];

export class Wholesaler {
  requests = 0;
  #rows;

  constructor(count) {
    this.#rows = Array.from({ length: count }, (_, index) => row(index + 1));
  }

  // The next hundred products after `sku`, or the first hundred without
  // one: fewer at the end, none after the last.
  async productsAfter(sku) {
    this.requests += 1;
    await new Promise((resolve) => setTimeout(resolve, ANSWER_MILLISECONDS));
    const start =
      sku === undefined
        ? 0
        : this.#rows.findIndex((product) => product.sku > sku);
    if (start === -1) return [];
    return this.#rows
      .slice(start, start + PAGE_SIZE)
      .map((product) => ({ ...product }));
  }

  // The wholesaler takes a product out of its range.
  stopSelling(sku) {
    const place = this.#rows.findIndex((product) => product.sku === sku);
    this.#rows.splice(place, 1);
  }
}

function row(number) {
  const [name, priceCents, weightGrams, stock] = KINDS[(number - 1) % 5];
  const sku = `W-${String(number).padStart(5, '0')}`;
  return { sku, name, priceCents, weightGrams, stock };
}
