// The office's live sales board: every order as it comes in.

import {
  type Cancel,
  type Order,
  type OrderEvents,
  formatMoney,
} from './orders.ts';
import type { Settings } from './settings.ts';

// One screen's rows: the orders placed since it was opened. Staff open a
// board on the office screen and close it when they go.
export class SalesBoard {
  readonly rows: string[] = [];
  readonly #shop: Settings;
  readonly #cancel: Cancel;

  constructor(events: OrderEvents, shop: Settings) {
    this.#shop = shop;
    // The events hold this board for as long as it is on their list:
    // close must take it off, or the board is never let go.
    this.#cancel = events.subscribe('placed', (order) => this.show(order));
  }

  // Add a row for an order just placed.
  show(order: Order): void {
    const total = formatMoney(order.totalCents, this.#shop);
    this.rows.push(`${order.orderId}  ${total}`);
  }

  // Leave the events, then clear the screen: whoever opened it is done
  // with it.
  close(): void {
    this.#cancel();
    this.rows.length = 0;
  }
}
