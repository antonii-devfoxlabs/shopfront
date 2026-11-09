// One order through the whole store: `npm start`.

import { Cart } from './cart.js';
import { starterCatalog } from './catalog.js';
import {
  OrderBuilder,
  formatMoney,
  nextOrderId,
  placeOrder,
} from './orders.js';
import { pay } from './payments.js';
import { PriceCalculator } from './pricing.js';
import { shippingCost } from './shipping.js';
import { Analytics } from './vendor/analytics.js';
import { Mailer } from './vendor/mailer.js';
import { TaxService } from './vendor/taxService.js';

const catalog = starterCatalog();
const cart = new Cart();
cart.add('MUG-01', 2);
cart.add('TEA-02');

const calculator = new PriceCalculator(catalog, new TaxService());
const quote = calculator.quote(cart, 'DE', {
  today: new Date(),
  coupon: 'WELCOME10',
});
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
console.log(`Email sent to ${mailer.outbox[0].to}`);
