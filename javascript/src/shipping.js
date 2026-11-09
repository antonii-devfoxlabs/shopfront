// What it costs to ship a cart.

import { estimate } from './vendor/boxroute.js';

/**
 * Every shipping provider fills this slot: a function of a parcel's
 * grams and its country that answers what the parcel costs, in cents.
 * @callback ShippingQuote
 * @param {number} grams
 * @param {string} country
 * @returns {number}
 */

/**
 * ParcelNow's client, made to answer as a ShippingQuote.
 * @returns {ShippingQuote}
 */
export function parcelNowQuote(client) {
  return (grams, country) => {
    const rate = client.getRate({
      weightKg: grams / 1000,
      destination: country,
    });
    const [euros, cents] = rate.amount.split('.');
    return Number(euros) * 100 + Number(cents);
  };
}

/**
 * SwiftShip's client, made to answer as a ShippingQuote.
 * @returns {ShippingQuote}
 */
export function swiftShipQuote(client) {
  return (grams, country) => client.quote({ grams, to: country });
}

/**
 * BoxRoute's estimate, made to answer as a ShippingQuote.
 * @type {ShippingQuote}
 */
export function boxRouteQuote(grams, country) {
  const price = estimate({ destination: country, kilos: grams / 1000 });
  return price.euros * 100 + price.cents;
}

export function cartWeightGrams(cart, catalog) {
  let grams = 0;
  for (const [sku, quantity] of cart.lines) {
    grams += catalog.find(sku).weightGrams * quantity;
  }
  return grams;
}

/** @param {ShippingQuote[]} providers */
export function shippingCost(
  cart,
  catalog,
  country,
  paidCents,
  providers,
  shop,
) {
  const weightGrams = cartWeightGrams(cart, catalog);
  if (country === shop.homeCountry) {
    if (paidCents >= shop.freeShippingFromCents) return 0;
  } else if (weightGrams > 5_000) {
    // Heavy parcels abroad go as freight: one flat price.
    return 3_500;
  }
  return Math.min(
    ...providers.map((provider) => provider(weightGrams, country)),
  );
}
