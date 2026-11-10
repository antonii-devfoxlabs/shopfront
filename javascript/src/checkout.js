// Selling a cart: what the store's pages call to take an order.

import { Cart } from './cart.js';
import { nextOrderId, placeOrder, reorder } from './orders.js';
import { pay } from './payments.js';
import { shippingCost } from './shipping.js';

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
