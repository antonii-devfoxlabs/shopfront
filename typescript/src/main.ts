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
import { GERMAN_SHOP } from './settings.ts';
import {
  boxRouteQuote,
  parcelNowQuote,
  shippingCost,
  swiftShipQuote,
} from './shipping.ts';
import { Analytics } from './vendor/analytics.ts';
import { Mailer } from './vendor/mailer.ts';
import { ParcelNowClient } from './vendor/parcelnow.ts';
import { PaymentGateway } from './vendor/paymentGateway.ts';
import { SwiftShip } from './vendor/swiftship.ts';
import { TaxService } from './vendor/taxService.ts';

// The one place that picks the shop, and hands it to every part.
const shop = GERMAN_SHOP;
const gateway = new PaymentGateway({ merchant: shop.merchantId });
const providers = [
  parcelNowQuote(new ParcelNowClient({ account: shop.parcelNowAccount })),
  swiftShipQuote(new SwiftShip()),
  boxRouteQuote,
];

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
const shippingCents = shippingCost(
  cart,
  catalog,
  'DE',
  paidCents,
  providers,
  shop,
);
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
console.log(`Email sent to ${mailer.outbox[0]?.to}`);
