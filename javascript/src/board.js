// The office's live sales board: every order as it comes in.

import { PLACED, formatMoney } from './orders.js';

/**
 * One screen's rows: the orders placed since it was opened. Staff open a
 * board on the office screen and close it when they go.
 */
export class SalesBoard {
  /** @type {string[]} */
  rows = [];
  #shop;

  /**
   * @param {import('./orders.js').OrderEvents} events
   * @param {import('./settings.js').Settings} shop
   */
  constructor(events, shop) {
    this.#shop = shop;
    events.on(PLACED, (order) => this.show(order));
  }

  /**
   * Add a row for an order just placed.
   * @param {import('./orders.js').Order} order
   */
  show(order) {
    const total = formatMoney(order.totalCents, this.#shop);
    this.rows.push(`${order.orderId}  ${total}`);
  }

  // Clear the screen: whoever opened it is done with it.
  close() {
    this.rows.length = 0;
  }
}
