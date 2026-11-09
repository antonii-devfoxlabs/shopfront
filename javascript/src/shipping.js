// What it costs to ship a cart.

import { estimate } from './vendor/boxroute.js';

/**
 * Every shipping provider fills this slot: what one parcel costs, in
 * cents.
 * @typedef {object} ShippingQuote
 * @property {(grams: number, country: string) => number} cost
 */

// ParcelNow's client, made to answer as a ShippingQuote.
export class ParcelNowQuote {
  constructor(client) {
    this.client = client;
  }

  cost(grams, country) {
    const rate = this.client.getRate({
      weightKg: grams / 1000,
      destination: country,
    });
    const [euros, cents] = rate.amount.split('.');
    return Number(euros) * 100 + Number(cents);
  }
}

// SwiftShip's client, made to answer as a ShippingQuote.
export class SwiftShipQuote {
  constructor(client) {
    this.client = client;
  }

  cost(grams, country) {
    return this.client.quote({ grams, to: country });
  }
}

// BoxRoute's estimate, made to answer as a ShippingQuote.
export class BoxRouteQuote {
  cost(grams, country) {
    const price = estimate({ destination: country, kilos: grams / 1000 });
    return price.euros * 100 + price.cents;
  }
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
    ...providers.map((provider) => provider.cost(weightGrams, country)),
  );
}
