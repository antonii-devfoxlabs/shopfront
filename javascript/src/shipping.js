// What it costs to ship a cart.

import { timed } from './timing.js';

export class NoShippingError extends Error {
  name = 'NoShippingError';
}

/**
 * Every shipping provider fills this slot: a function of a parcel's
 * grams and its country that answers what the parcel costs, in cents.
 * @callback ShippingQuote
 * @param {number} grams
 * @param {string} country
 * @returns {number}
 */

export function cartWeightGrams(cart, catalog) {
  let grams = 0;
  for (const [sku, quantity] of cart.lines) {
    grams += catalog.find(sku).weightGrams * quantity;
  }
  return grams;
}

// Every caller gets the timed shipping cost, the tests included.
export const shippingCost = timed(
  'shipping cost',
  /** @param {ShippingQuote[]} providers */
  function shippingCost(cart, catalog, country, paidCents, providers, shop) {
    const weightGrams = cartWeightGrams(cart, catalog);
    if (country === shop.homeCountry) {
      if (paidCents >= shop.freeShippingFromCents) return 0;
    } else if (weightGrams > 5_000) {
      // Heavy parcels abroad go as freight: one flat price.
      return 3_500;
    }
    const costs = [];
    for (const provider of providers) {
      try {
        costs.push(provider(weightGrams, country));
      } catch (error) {
        if (error instanceof NoShippingError) {
          // This provider does not ship there: ask the others.
          continue;
        }
        throw error;
      }
    }
    if (costs.length === 0) throw new NoShippingError(country);
    return Math.min(...costs);
  },
  console.log,
);
