// Orders sent back, and the money that goes back with them.

import { formatMoney } from './money.js';
import { REFUNDED, statusOf } from './orders.js';
import { refund } from './payments.js';

// An order sent back. Its money goes back to the way to pay named to:
// the way the order was paid, unless the caller names another.
export class Return {
  constructor(order, details, gateway, to = order.paymentMethod) {
    this.order = order;
    this.details = details;
    this.gateway = gateway;
    this.to = to;
  }

  // Give the money back once, and mark the order returned.
  process() {
    this.order.checkReturnable();
    const refundId = refund(
      this.to,
      this.order.totalCents,
      this.details,
      this.gateway,
    );
    this.order.markReturned();
    return refundId;
  }
}

// A product sent back and the same one sent again: the sale stands, and
// no money moves, so an exchange is not a Return.
export class Exchange {
  constructor(order) {
    this.order = order;
  }

  // Take the product back, and mark the order exchanged.
  process() {
    this.order.markExchanged();
  }
}

export class GoodwillRefusedError extends Error {
  name = 'GoodwillRefusedError';
}

// The part of an order's total the support team gives back, in percent,
// by what went wrong with the parcel.
const GOODWILL_PERCENT = new Map([
  ['late', 10],
  ['damaged', 50],
]);

// What the store gives back for a parcel that went wrong: only for an
// order that has left, and is still a sale.
export function goodwillCents(order, reason) {
  if (order.parcel === null || !statusOf(order).sale) {
    throw new GoodwillRefusedError(`${order.orderId} is ${order.status}`);
  }
  const percent = GOODWILL_PERCENT.get(reason);
  if (percent === undefined) {
    throw new GoodwillRefusedError(`no goodwill for ${reason}`);
  }
  return Math.floor((order.totalCents * percent) / 100);
}

// The calls that give an order's money back, and tell the shopper.
// The return page builds it once with its parts and calls refund(); the
// support page calls makeGood().
export class Refunds {
  #parts;

  // The parts, by name: gateway, mailer, shop, book (the store's one order
  // book, where the order is found), and events: who hears of a refund.
  // main subscribes them.
  constructor(parts) {
    this.#parts = parts;
  }

  // Give an order's money back, tell the shopper, then announce it.
  // to, if given: the way to pay the money goes back to, as Return takes it.
  refund(orderId, details, to) {
    const { gateway, mailer, shop, book, events } = this.#parts;
    const order = book.find(orderId);
    const refundId = new Return(order, details, gateway, to).process();
    mailer.send({
      from: shop.storeEmail,
      to: order.customerEmail,
      subject: `${shop.storeName}: refund for ${order.orderId}`,
      body:
        `Hi ${order.customerName}, we have refunded ` +
        `${formatMoney(order.totalCents, shop)}.`,
    });
    events.emit(REFUNDED, order);
    return refundId;
  }

  // Give part of an order's money back for a parcel that went wrong, and
  // tell the shopper. The order stays as it is, and nothing is announced:
  // nothing comes back to the warehouse.
  makeGood(orderId, reason, details) {
    const { gateway, mailer, shop, book } = this.#parts;
    const order = book.find(orderId);
    const cents = goodwillCents(order, reason);
    const refundId = refund(order.paymentMethod, cents, details, gateway);
    mailer.send({
      from: shop.storeEmail,
      to: order.customerEmail,
      subject: `${shop.storeName}: refund for ${order.orderId}`,
      body:
        `Hi ${order.customerName}, sorry about your parcel: we have ` +
        `refunded ${formatMoney(cents, shop)}.`,
    });
    return refundId;
  }
}
