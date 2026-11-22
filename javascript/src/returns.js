// Orders sent back, and the money that goes back with them.

import { formatMoney } from './money.js';
import { REFUNDED } from './orders.js';
import { refund } from './payments.js';
import { goodwillCents } from './support.js';

// An order sent back. Its money goes back to the way to pay named to:
// the way the order was paid, unless the caller names another.
export class Return {
  constructor(
    order,
    details,
    gateway,
    to = order.paymentMethod,
    cents = null,
  ) {
    this.order = order;
    this.details = details;
    this.gateway = gateway;
    this.to = to;
    // A goodwill credit gives back only part of the money, and the order
    // is not sent back.
    this.cents = cents;
  }

  // Give the money back once, and mark the order returned.
  process() {
    let cents = this.cents;
    if (this.cents === null) {
      this.order.checkReturnable();
      cents = this.order.totalCents;
    }
    const refundId = refund(this.to, cents, this.details, this.gateway);
    if (this.cents === null) {
      this.order.markReturned();
    }
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

// One call that gives an order's money back, and tells the shopper.
// The return page builds it once with its parts and calls refund().
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
  // reason, if given: what went wrong with the parcel, for a goodwill
  // credit.
  refund(orderId, details, to = undefined, reason = null) {
    const { gateway, mailer, shop, book, events } = this.#parts;
    const order = book.find(orderId);
    let cents = null;
    if (reason !== null) {
      cents = goodwillCents(order, reason);
    }
    const refundId = new Return(order, details, gateway, to, cents).process();
    let body;
    if (cents === null) {
      body =
        `Hi ${order.customerName}, we have refunded ` +
        `${formatMoney(order.totalCents, shop)}.`;
    } else {
      body =
        `Hi ${order.customerName}, sorry about your parcel: we have ` +
        `refunded ${formatMoney(cents, shop)}.`;
    }
    mailer.send({
      from: shop.storeEmail,
      to: order.customerEmail,
      subject: `${shop.storeName}: refund for ${order.orderId}`,
      body,
    });
    events.emit(REFUNDED, order);
    return refundId;
  }
}
