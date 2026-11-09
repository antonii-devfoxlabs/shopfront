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
import { GERMAN_SHOP } from './settings.js';
import { shippingCost } from './shipping.js';
import { Analytics } from './vendor/analytics.js';
import { Mailer } from './vendor/mailer.js';
import { PaymentGateway } from './vendor/paymentGateway.js';
import { TaxService } from './vendor/taxService.js';

// The one place that picks the shop, and hands it to every part.
const shop = GERMAN_SHOP;
const gateway = new PaymentGateway({ merchant: shop.merchantId });

const catalog = starterCatalog();
const cart = new Cart();
cart.add('MUG-01', 2);
cart.add('TEA-02');

const calculator = new PriceCalculator(catalog, new TaxService(), shop);
const quote = calculator.quote(cart, 'DE', {
  today: new Date(),
  coupon: 'WELCOME10',
});
const paidCents = quote.subtotalCents - quote.discountCents;
const shippingCents = shippingCost(cart, catalog, 'DE', paidCents, shop);
const totalCents = paidCents + quote.taxCents + shippingCents;

const orderId = nextOrderId();
const transactionId = pay(
  'card',
  totalCents,
  { cardToken: 'tok-4242' },
  gateway,
);
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
placeOrder(order, catalog, mailer, new Analytics(), shop);

console.log(`Order ${order.orderId} placed`);
console.log(`  subtotal  ${formatMoney(order.subtotalCents, shop)}`);
if (order.discountCents > 0) {
  console.log(`  discount -${formatMoney(order.discountCents, shop)}`);
}
console.log(`  tax       ${formatMoney(order.taxCents, shop)}`);
console.log(`  shipping  ${formatMoney(order.shippingCents, shop)}`);
console.log(`  total     ${formatMoney(order.totalCents, shop)}`);
console.log(`Email sent to ${mailer.outbox[0].to}`);
