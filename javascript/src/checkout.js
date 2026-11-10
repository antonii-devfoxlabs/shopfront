// Selling a cart: what the store's pages call to take an order.

import { Cart } from './cart.js';
import { OrderBuilder, nextOrderId, placeOrder, reorder } from './orders.js';
import { pay } from './payments.js';
import { shippingCost } from './shipping.js';

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

  // Price the cart, ship it, take the money, then place the order.
  buy(cart, country, { email, name, paidBy, details, today, coupon = null }) {
    const parts = this.#parts;
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
}

// The Buy again button: the same products, to the same address.
export function buyAgain(
  previous,
  details,
  today,
  calculator,
  providers,
  catalog,
  gateway,
  mailer,
  analytics,
  shop,
) {
  const builder = reorder(previous, nextOrderId());
  const cart = new Cart();
  for (const [sku, quantity] of previous.lines) cart.add(sku, quantity);
  const country = previous.shippingCountry;

  const quote = calculator.quote(cart, country, { today });
  builder.subtotal(quote.subtotalCents);
  builder.discount(quote.discountCents);
  builder.tax(quote.taxCents);

  const paidCents = quote.subtotalCents - quote.discountCents;
  const shippingCents = shippingCost(
    cart,
    catalog,
    country,
    paidCents,
    providers,
    shop,
  );
  builder.shipping(shippingCents);

  const totalCents = paidCents + quote.taxCents + shippingCents;
  const transactionId = pay(
    previous.paymentMethod,
    totalCents,
    details,
    gateway,
  );
  builder.paidBy(previous.paymentMethod).transaction(transactionId);
  const order = builder.build();
  placeOrder(order, catalog, mailer, analytics, shop);
  return order;
}
