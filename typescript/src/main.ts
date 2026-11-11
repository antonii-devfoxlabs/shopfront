// One order through the whole store: `npm start`.

import { Cart } from './cart.ts';
import type { Catalog } from './catalog.ts';
import { CatalogError, loadCatalog } from './catalogFile.ts';
import { Checkout } from './checkout.ts';
import { TimedGateway } from './gateways.ts';
import { emailShopper, textWarehouse, trackOrder } from './listeners.ts';
import { formatMoney } from './orders.ts';
import { PriceCalculator, type QuoteOptions } from './pricing.ts';
import {
  boxRouteQuote,
  parcelNowQuote,
  swiftShipQuote,
} from './providers.ts';
import { GERMAN_SHOP } from './settings.ts';
import { Shipping, offerFor } from './shipping.ts';
import { CachedRates, TimedRates } from './taxes.ts';
import { timed } from './timing.ts';
import { Analytics } from './vendor/analytics.ts';
import { Mailer } from './vendor/mailer.ts';
import { ParcelNowClient } from './vendor/parcelnow.ts';
import { PaymentGateway } from './vendor/paymentGateway.ts';
import { Sms } from './vendor/sms.ts';
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
// The shop's settings name its offer; main hands it the real clock.
const shipping = new Shipping({
  offer: offerFor(shop, () => new Date()),
  providers,
  shop,
});

// The owner edits catalog.json; the shop reads it when it starts, and
// will not start on a file it cannot read.
let catalog: Catalog;
try {
  catalog = loadCatalog('catalog.json');
} catch (error) {
  if (!(error instanceof CatalogError)) throw error;
  console.error(`Cannot start: ${error.message}`);
  process.exit(1);
}
const cart = new Cart();
cart.add('MUG-01', 2);
cart.add('TEA-02');

// The cache is outside the timer, so the log shows each real lookup
// of the tax service, and how long the service took.
const taxes = new CachedRates(new TimedRates(new TaxService(), console.log));
const calculator = new PriceCalculator(catalog, taxes, shop);
const mailer = new Mailer();
const sms = new Sms();
// Kept by name: the staff page takes it off the list while the warehouse
// is closed (24 to 26 December), and puts it back after.
const warehouse = textWarehouse(sms, shop);
// Everyone who must hear of a placed order, told in this order. One more
// is one more line here: placing an order does not change.
const listeners = [
  emailShopper(mailer, shop),
  trackOrder(new Analytics()),
  warehouse,
];
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
  shippingCost: timed(
    'shipping cost',
    (cart: Cart, catalog: Catalog, country: string, paidCents: number) =>
      shipping.cost(cart, catalog, country, paidCents),
    console.log,
  ),
  catalog,
  gateway,
  listeners,
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
console.log(`Text sent to ${sms.outbox[0]?.to}`);
