// Selling a cart: what the store's pages call to take an order.

import { Cart } from './cart.js';
import {
  OrderBook,
  OrderBuilder,
  formatMoney,
  nextOrderId,
  placeOrder,
} from './orders.js';
import { pay } from './payments.js';
import { Return } from './returns.js';

// One call that sells a cart: every step of an order, in order.
// main hands it the store's parts once; a page calls buy().
export class Checkout {
  #parts;

  // The parts, by name: quote and shippingCost (the functions it calls,
  // timed or not, as main chooses), providers, catalog, gateway, mailer,
  // analytics and shop.
  constructor(parts) {
    this.#parts = parts;
  }

  // Check the stock, price the cart, ship it, take the money, then place
  // the order.
  buy(cart, country, { email, name, paidBy, details, today, coupon = null }) {
    const parts = this.#parts;
    // Never charge a card for an order the store cannot send.
    parts.catalog.checkStock(cart.lines);
    const quote = parts.quote(cart, country, { today, coupon });
    const paidCents = quote.subtotalCents - quote.discountCents;
    const shippingCents = parts.shippingCost(
      cart,
      parts.catalog,
      country,
      paidCents,
      parts.providers,
      parts.shop,
    );
    const totalCents = paidCents + quote.taxCents + shippingCents;

    const transactionId = pay(paidBy, totalCents, details, parts.gateway);
    const order = new OrderBuilder(nextOrderId())
      .email(email)
      .name(name)
      .lines(cart.lines)
      .subtotal(quote.subtotalCents)
      .discount(quote.discountCents)
      .tax(quote.taxCents)
      .shipping(shippingCents)
      .country(country)
      .paidBy(paidBy)
      .transaction(transactionId)
      .build();
    placeOrder(
      order,
      parts.catalog,
      parts.mailer,
      parts.analytics,
      parts.shop,
    );
    return order;
  }

  // Give an order's money back, and tell the shopper.
  refund(orderId, details) {
    const { gateway, mailer, shop } = this.#parts;
    const order = OrderBook.instance().find(orderId);
    const refundId = new Return(order, details, gateway).process();
    mailer.send({
      from: shop.storeEmail,
      to: order.customerEmail,
      subject: `${shop.storeName}: refund for ${order.orderId}`,
      body:
        `Hi ${order.customerName}, we have refunded ` +
        `${formatMoney(order.totalCents, shop)}.`,
    });
    return refundId;
  }

  // The owner's Monday line: the orders kept, and what they took.
  salesReport() {
    const kept = OrderBook.instance()
      .orders()
      .filter((order) => order.status === 'placed');
    let takings = 0;
    for (const order of kept) takings += order.totalCents;
    return (
      `Orders: ${kept.length}, ` +
      `takings: ${formatMoney(takings, this.#parts.shop)}`
    );
  }
}

// The Buy again button: the same products, to the same address.
export function buyAgain(checkout, previous, details, today) {
  const cart = new Cart();
  for (const [sku, quantity] of previous.lines) cart.add(sku, quantity);
  return checkout.buy(cart, previous.shippingCountry, {
    email: previous.customerEmail,
    name: previous.customerName,
    paidBy: previous.paymentMethod,
    details,
    today,
  });
}
