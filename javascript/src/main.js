// One order through the whole store: `npm start`.

import { Cart } from './cart.js';
import { CatalogError, loadCatalog } from './catalogFile.js';
import { Checkout } from './checkout.js';
import { TimedGateway } from './gateways.js';
import {
  emailShopper,
  expectReturn,
  textWarehouse,
  trackOrder,
} from './listeners.js';
import { OrderEvents, formatMoney } from './orders.js';
import { PriceCalculator } from './pricing.js';
import {
  boxRouteQuote,
  parcelNowQuote,
  swiftShipQuote,
} from './providers.js';
import { GERMAN_SHOP } from './settings.js';
import { Shipping, offerFor } from './shipping.js';
import { CachedRates, TimedRates } from './taxes.js';
import { timed } from './timing.js';
import { Analytics } from './vendor/analytics.js';
import { Mailer } from './vendor/mailer.js';
import { ParcelNowClient } from './vendor/parcelnow.js';
import { PaymentGateway } from './vendor/paymentGateway.js';
import { Sms } from './vendor/sms.js';
import { SwiftShip } from './vendor/swiftship.js';
import { TaxService } from './vendor/taxService.js';

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
let catalog;
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
// Kept by name: the staff page unsubscribes it while the warehouse is
// closed (24 to 26 December), and subscribes it again after.
const warehouse = textWarehouse(sms, shop);
// Everyone who hears of a placed or refunded order, by the news's name,
// told in the order they subscribe. One more is one more line here.
const events = new OrderEvents();
events.subscribe('placed', emailShopper(mailer, shop));
events.subscribe('placed', trackOrder(new Analytics()));
events.subscribe('placed', warehouse);
// Refunds, made for the return page, tell the same events.
events.subscribe('refunded', expectReturn(sms, shop));
// Every step of an order, in order, behind one call. main still
// decides what is timed, and hands the checkout the timed parts.
const checkout = new Checkout({
  // The timer is outside the calculator, so every quote is timed:
  // what a shopper waits for a price, cached rate or not.
  quote: timed(
    'price quote',
    (cart, country, options) => calculator.quote(cart, country, options),
    console.log,
  ),
  shippingCost: timed(
    'shipping cost',
    (cart, catalog, country, paidCents) =>
      shipping.cost(cart, catalog, country, paidCents),
    console.log,
  ),
  catalog,
  gateway,
  events,
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
console.log(`Email sent to ${mailer.outbox[0].to}`);
console.log(`Text sent to ${sms.outbox[0].to}`);
