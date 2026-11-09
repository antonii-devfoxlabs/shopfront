// What it costs to ship a cart.

import type { Cart } from './cart.ts';
import type { Catalog } from './catalog.ts';
import type { Settings } from './settings.ts';
import { BoxRouteError, estimate } from './vendor/boxroute.ts';
import { type ParcelNowClient, ParcelNowError } from './vendor/parcelnow.ts';
import { type SwiftShip, SwiftShipError } from './vendor/swiftship.ts';

export class NoShippingError extends Error {
  override name = 'NoShippingError';
}

// Every shipping provider fills this slot: a function of a parcel's
// grams and its country that answers what the parcel costs, in cents.
export type ShippingQuote = (grams: number, country: string) => number;

// ParcelNow's client, made to answer as a ShippingQuote.
export function parcelNowQuote(client: ParcelNowClient): ShippingQuote {
  return (grams, country) => {
    try {
      const rate = client.getRate({
        weightKg: grams / 1000,
        destination: country,
      });
      const [euros, cents] = rate.amount.split('.');
      return Number(euros) * 100 + Number(cents);
    } catch (error) {
      if (error instanceof ParcelNowError) {
        throw new NoShippingError(country, { cause: error });
      }
      throw error;
    }
  };
}

// SwiftShip's client, made to answer as a ShippingQuote.
export function swiftShipQuote(client: SwiftShip): ShippingQuote {
  return (grams, country) => {
    try {
      return client.quote({ grams, to: country });
    } catch (error) {
      if (error instanceof SwiftShipError) {
        throw new NoShippingError(country, { cause: error });
      }
      throw error;
    }
  };
}

// BoxRoute's estimate, made to answer as a ShippingQuote.
export function boxRouteQuote(grams: number, country: string): number {
  try {
    const price = estimate({ destination: country, kilos: grams / 1000 });
    return price.euros * 100 + price.cents;
  } catch (error) {
    if (error instanceof BoxRouteError) {
      throw new NoShippingError(country, { cause: error });
    }
    throw error;
  }
}

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
