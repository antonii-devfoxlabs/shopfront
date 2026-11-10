// One order through the whole store: `npm start`.

import { readFileSync } from 'node:fs';

import { Cart } from './cart.ts';
import { Catalog } from './catalog.ts';
import { Checkout } from './checkout.ts';
import { TimedGateway } from './gateways.ts';
import { formatMoney } from './orders.ts';
import { PriceCalculator, type QuoteOptions } from './pricing.ts';
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

// The owner edits catalog.json; the shop reads it when it starts.
const text = readFileSync('catalog.json', 'utf8');
const rows: {
  sku: string;
  name: string;
  price_cents: number;
  weight_grams: number;
  stock: number;
}[] = JSON.parse(text);
const catalog = new Catalog(
  rows.map((row) => ({
    sku: row.sku,
    name: row.name,
    priceCents: row.price_cents,
    weightGrams: row.weight_grams,
    stock: row.stock,
  })),
);
const cart = new Cart();
cart.add('MUG-01', 2);
cart.add('TEA-02');

// The cache is outside the timer, so the log shows each real lookup
// of the tax service, and how long the service took.
const taxes = new CachedRates(new TimedRates(new TaxService(), console.log));
const calculator = new PriceCalculator(catalog, taxes, shop);
const mailer = new Mailer();
// Every step of an order, in order, behind one call. main still
// decides what is timed, and hands the checkout the timed parts.
const checkout = new Checkout({
  // The timer is outside the calculator, so every quote is timed:
  // what a shopper waits for a price, cached rate or not.
  quote: timed(
    'price quote',
    (cart: Cart, country: string, options: QuoteOptions) =>
      calculator.quote(cart, country, options),
    console.log,
  ),
  shippingCost: timed('shipping cost', shippingCost, console.log),
  providers,
  catalog,
  gateway,
  mailer,
  analytics: new Analytics(),
  shop,
});
const order = checkout.buy(cart, 'DE', {
  email: 'ada@example.com',
  name: 'Ada',
  paidBy: 'card',
  details: { cardToken: 'tok-4242' },
  today: new Date(),
  coupon: 'WELCOME10',
});

console.log(`Order ${order.orderId} placed`);
console.log(`  subtotal  ${formatMoney(order.subtotalCents, shop)}`);
if (order.discountCents > 0) {
  console.log(`  discount -${formatMoney(order.discountCents, shop)}`);
}
console.log(`  tax       ${formatMoney(order.taxCents, shop)}`);
console.log(`  shipping  ${formatMoney(order.shippingCents, shop)}`);
console.log(`  total     ${formatMoney(order.totalCents, shop)}`);
console.log(`Email sent to ${mailer.outbox[0]?.to}`);
