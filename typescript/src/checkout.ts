// Selling a cart: what the store's pages call to take an order.

import { Cart } from './cart.ts';
import type { Catalog } from './catalog.ts';
import {
  type Order,
  OrderBuilder,
  nextOrderId,
  placeOrder,
} from './orders.ts';
import { type Gateway, type PaymentDetails, pay } from './payments.ts';
import type { PriceQuote, QuoteOptions } from './pricing.ts';
import type { Settings } from './settings.ts';
import { type ShippingQuote, shippingCost } from './shipping.ts';
import type { Analytics } from './vendor/analytics.ts';
import type { Mailer } from './vendor/mailer.ts';

// The parts main hands the checkout once. quote and shippingCost are the
// functions it calls, timed or not, as main chooses.
export type CheckoutParts = {
  quote: (cart: Cart, country: string, options: QuoteOptions) => PriceQuote;
  shippingCost: typeof shippingCost;
  providers: readonly ShippingQuote[];
  catalog: Catalog;
  gateway: Gateway;
  mailer: Mailer;
  analytics: Analytics;
  shop: Settings;
};

// What a page knows about one purchase.
export type Purchase = {
  email: string;
  name: string;
  paidBy: string;
  details: PaymentDetails;
  today: Date;
  coupon?: string | null;
};

// One call that sells a cart: every step of an order, in order.
// main hands it the store's parts once; a page calls buy().
export class Checkout {
  readonly #parts: CheckoutParts;

  constructor(parts: CheckoutParts) {
    this.#parts = parts;
  }

  // Check the stock, price the cart, ship it, take the money, then place
  // the order.
  buy(
    cart: Cart,
    country: string,
    { email, name, paidBy, details, today, coupon = null }: Purchase,
  ): Order {
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
      today,
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
  checkout: Checkout,
  previous: Order,
  details: PaymentDetails,
  today: Date,
): Order {
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
