// One order through the whole store: `npm start`.

import { Cart } from './cart.ts';
import { starterCatalog } from './catalog.ts';
import { TimedGateway } from './gateways.ts';
import {
  OrderBuilder,
  formatMoney,
  nextOrderId,
  placeOrder,
} from './orders.ts';
import { pay } from './payments.ts';
import { PriceCalculator } from './pricing.ts';
import {
  boxRouteQuote,
  parcelNowQuote,
  swiftShipQuote,
} from './providers.ts';
import { GERMAN_SHOP } from './settings.ts';
import { shippingCost } from './shipping.ts';
import { CachedRates, TimedRates } from './taxes.ts';
import { timed } from './timing.ts';
import { Analytics } from './vendor/analytics.ts';
import { Mailer } from './vendor/mailer.ts';
import { ParcelNowClient } from './vendor/parcelnow.ts';
import { PaymentGateway } from './vendor/paymentGateway.ts';
import { SwiftShip } from './vendor/swiftship.ts';
import { TaxService } from './vendor/taxService.ts';

// The one place that picks the shop, and hands it to every part.
const shop = GERMAN_SHOP;
// Every call to the payment gateway is timed and logged.
const gateway = new TimedGateway(
  new PaymentGateway({ merchant: shop.merchantId }),
  console.log,
);
// Every shipping quote is timed and logged, and so is the whole cost.
const parcelNow = new ParcelNowClient({ account: shop.parcelNowAccount });
const providers = [
  timed('parcelnow quote', parcelNowQuote(parcelNow), console.log),
  timed('swiftship quote', swiftShipQuote(new SwiftShip()), console.log),
  timed('boxroute quote', boxRouteQuote, console.log),
];

const catalog = starterCatalog();
const cart = new Cart();
cart.add('MUG-01', 2);
cart.add('TEA-02');

// Each rate is asked once, and each real lookup is timed and logged.
const taxes = new CachedRates(new TimedRates(new TaxService(), console.log));
const calculator = new PriceCalculator(catalog, taxes, shop);
const quote = calculator.quote(cart, 'DE', {
  today: new Date(),
  coupon: 'WELCOME10',
});
const paidCents = quote.subtotalCents - quote.discountCents;
const timedShippingCost = timed('shipping cost', shippingCost, console.log);
const shippingCents = timedShippingCost(
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
