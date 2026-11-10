// Selling a cart: what the store's pages call to take an order.

import { Cart } from './cart.ts';
import type { Catalog } from './catalog.ts';
import { type Order, nextOrderId, placeOrder, reorder } from './orders.ts';
import { type Gateway, type PaymentDetails, pay } from './payments.ts';
import type { PriceCalculator } from './pricing.ts';
import type { Settings } from './settings.ts';
import { type ShippingQuote, shippingCost } from './shipping.ts';
import type { Analytics } from './vendor/analytics.ts';
import type { Mailer } from './vendor/mailer.ts';

// The Buy again button: the same products, to the same address.
export function buyAgain(
  previous: Order,
  details: PaymentDetails,
  today: Date,
  calculator: PriceCalculator,
  providers: readonly ShippingQuote[],
  catalog: Catalog,
  gateway: Gateway,
  mailer: Mailer,
  analytics: Analytics,
  shop: Settings,
): Order {
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
