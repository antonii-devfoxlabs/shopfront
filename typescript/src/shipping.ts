// What it costs to ship a cart.

import type { Cart } from './cart.ts';
import type { Catalog } from './catalog.ts';
import type { Settings } from './settings.ts';

export class NoShippingError extends Error {
  override name = 'NoShippingError';
}

// Every shipping provider fills this slot: a function of a parcel's
// grams and its country that answers what the parcel costs, in cents.
export type ShippingQuote = (grams: number, country: string) => number;

export function cartWeightGrams(cart: Cart, catalog: Catalog): number {
  let grams = 0;
  for (const [sku, quantity] of cart.lines) {
    grams += catalog.find(sku).weightGrams * quantity;
  }
  return grams;
}

export function shippingCost(
  cart: Cart,
  catalog: Catalog,
  country: string,
  paidCents: number,
  providers: readonly ShippingQuote[],
  shop: Settings,
): number {
  const weightGrams = cartWeightGrams(cart, catalog);
  if (country === shop.homeCountry) {
    if (paidCents >= shop.freeShippingFromCents) return 0;
  } else if (weightGrams > 5_000) {
    // Heavy parcels abroad go as freight: one flat price.
    return 3_500;
  }
  const costs: number[] = [];
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
}
