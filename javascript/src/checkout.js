// Selling a cart: what the store's pages call to take an order.

import { Cart } from './cart.js';
import { OrderBuilder, nextOrderId, placeOrder } from './orders.js';
import { pay } from './payments.js';

// One call that sells a cart: every step of an order, in order.
// main hands it the store's parts once; a page calls buy().
export class Checkout {
  #parts;

  // The parts, by name: quote and shippingCost (the functions it calls,
  // timed or not, as main chooses), catalog, gateway, and listeners:
  // everyone who must hear of a placed order, picked by main.
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
    placeOrder(order, parts.catalog, parts.listeners);
    return order;
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
