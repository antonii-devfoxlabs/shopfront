// The office's live sales board: every order as it comes in.

import { type Order, type OrderEvents, formatMoney } from './orders.ts';
import type { Settings } from './settings.ts';

// One screen's rows: the orders placed since it was opened. Staff open a
// board on the office screen and close it when they go.
export class SalesBoard {
  readonly rows: string[] = [];
  readonly #shop: Settings;

  constructor(events: OrderEvents, shop: Settings) {
    this.#shop = shop;
    events.on('placed', (order) => this.show(order));
  }

  // Add a row for an order just placed.
  show(order: Order): void {
    const total = formatMoney(order.totalCents, this.#shop);
    this.rows.push(`${order.orderId}  ${total}`);
  }

  // Clear the screen: whoever opened it is done with it.
  close(): void {
    this.rows.length = 0;
  }
}
