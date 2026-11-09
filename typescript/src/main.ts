// One order through the whole store: `npm start`.

import { Cart } from './cart.ts';
import { starterCatalog } from './catalog.ts';
import {
  OrderBuilder,
  formatMoney,
  nextOrderId,
  placeOrder,
} from './orders.ts';
import { pay } from './payments.ts';
import { PriceCalculator } from './pricing.ts';
import { shippingCost } from './shipping.ts';
import { Analytics } from './vendor/analytics.ts';
import { Mailer } from './vendor/mailer.ts';
import { TaxService } from './vendor/taxService.ts';

const catalog = starterCatalog();
const cart = new Cart();
cart.add('MUG-01', 2);
cart.add('TEA-02');

const calculator = new PriceCalculator(catalog, new TaxService());
const quote = calculator.quote(cart, 'DE', 'WELCOME10', new Date());
const paidCents = quote.subtotalCents - quote.discountCents;
const shippingCents = shippingCost(cart, catalog, 'DE', paidCents);
const totalCents = paidCents + quote.taxCents + shippingCents;

const orderId = nextOrderId();
const transactionId = pay('card', totalCents, { cardToken: 'tok-4242' });
const order = new OrderBuilder(orderId)
  .email('ada@example.com')
  .name('Ada')
  .lines(cart.lines)
  .subtotal(quote.subtotalCents)
  .discount(quote.discountCents)
  .tax(quote.taxCents)
  .shipping(shippingCents)
  .country('DE')
  .paidBy('card')
  .transaction(transactionId)
  .build();
const mailer = new Mailer();
placeOrder(order, catalog, mailer, new Analytics());

console.log(`Order ${order.orderId} placed`);
console.log(`  subtotal  ${formatMoney(order.subtotalCents)}`);
if (order.discountCents > 0) {
  console.log(`  discount -${formatMoney(order.discountCents)}`);
}
console.log(`  tax       ${formatMoney(order.taxCents)}`);
console.log(`  shipping  ${formatMoney(order.shippingCents)}`);
console.log(`  total     ${formatMoney(order.totalCents)}`);
console.log(`Email sent to ${mailer.outbox[0]?.to}`);
