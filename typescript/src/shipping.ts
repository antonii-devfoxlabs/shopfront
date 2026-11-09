// What it costs to ship a cart.

import type { Cart } from './cart.ts';
import type { Catalog } from './catalog.ts';
import type { Settings } from './settings.ts';
import { estimate } from './vendor/boxroute.ts';
import type { ParcelNowClient } from './vendor/parcelnow.ts';
import type { SwiftShip } from './vendor/swiftship.ts';

export interface ShippingQuote {
  // What one parcel costs, in cents.
  cost(grams: number, country: string): number;
}

// ParcelNow's client, made to answer as a ShippingQuote.
export class ParcelNowQuote implements ShippingQuote {
  readonly client: ParcelNowClient;

  constructor(client: ParcelNowClient) {
    this.client = client;
  }

  cost(grams: number, country: string): number {
    const rate = this.client.getRate({
      weightKg: grams / 1000,
      destination: country,
    });
    const [euros, cents] = rate.amount.split('.');
    return Number(euros) * 100 + Number(cents);
  }
}

// SwiftShip's client, made to answer as a ShippingQuote.
export class SwiftShipQuote implements ShippingQuote {
  readonly client: SwiftShip;

  constructor(client: SwiftShip) {
    this.client = client;
  }

  cost(grams: number, country: string): number {
    return this.client.quote({ grams, to: country });
  }
}

// BoxRoute's estimate, made to answer as a ShippingQuote.
export class BoxRouteQuote implements ShippingQuote {
  cost(grams: number, country: string): number {
    const price = estimate({ destination: country, kilos: grams / 1000 });
    return price.euros * 100 + price.cents;
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
  return Math.min(
    ...providers.map((provider) => provider.cost(weightGrams, country)),
  );
}
