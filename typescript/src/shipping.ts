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

const FRIDAY = 5; // What a Date's getDay() answers on a Friday: Sunday is 0.

export function cartWeightGrams(cart: Cart, catalog: Catalog): number {
  let grams = 0;
  for (const [sku, quantity] of cart.lines) {
    grams += catalog.find(sku).weightGrams * quantity;
  }
  return grams;
}

// One way the store prices a parcel: its grams and its country in, whole
// cents out.
export interface ShippingRule {
  cost(grams: number, country: string): number;
}

// One price for every parcel, whatever it weighs; new Flat(0) is free.
export class Flat implements ShippingRule {
  readonly cents: number;

  constructor(cents: number) {
    this.cents = cents;
  }

  cost(grams: number, country: string): number {
    return this.cents;
  }
}

// Ask every shipping provider, and take the cheapest answer.
export class Cheapest implements ShippingRule {
  readonly providers: readonly ShippingQuote[];

  constructor(providers: readonly ShippingQuote[]) {
    this.providers = providers;
  }

  cost(grams: number, country: string): number {
    const costs: number[] = [];
    for (const provider of this.providers) {
      try {
        costs.push(provider(grams, country));
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
}

// An offer that lets an order at home ship free: the amount paid in, yes
// or no out.
export interface ShippingOffer {
  shipsFree(paidCents: number): boolean;
}

// On Fridays, orders from fromCents ship free. today is the clock the
// offer reads: main hands in () => new Date(), a test a fixed day.
export class FreeFriday implements ShippingOffer {
  readonly fromCents: number;
  readonly today: () => Date;

  constructor(fromCents: number, today: () => Date) {
    this.fromCents = fromCents;
    this.today = today;
  }

  shipsFree(paidCents: number): boolean {
    return this.today().getDay() === FRIDAY && paidCents >= this.fromCents;
  }
}

// What main hands the shipping once.
export type ShippingParts = {
  offer: ShippingOffer;
  providers: readonly ShippingQuote[];
  shop: Settings;
};

// What one shop charges to ship an order. main hands it the shop, the
// providers and the offer the shop runs; it never picks an offer itself.
export class Shipping {
  readonly offer: ShippingOffer;
  readonly providers: readonly ShippingQuote[];
  readonly shop: Settings;

  constructor({ offer, providers, shop }: ShippingParts) {
    this.offer = offer;
    this.providers = providers;
    this.shop = shop;
  }

  cost(
    cart: Cart,
    catalog: Catalog,
    country: string,
    paidCents: number,
  ): number {
    const weightGrams = cartWeightGrams(cart, catalog);
    const atHome = country === this.shop.homeCountry;
    // Pick the rule for this order. The first question that says yes
    // wins, so a rule's place in the list is part of the rule.
    let rule: ShippingRule;
    if (atHome && paidCents >= this.shop.freeShippingFromCents) {
      rule = new Flat(0);
    } else if (atHome && this.offer.shipsFree(paidCents)) {
      // The shop's offer, whichever one main handed in.
      rule = new Flat(0);
    } else if (country === 'CH') {
      // No provider ships to Switzerland: a courier, one flat price,
      // heavy parcels too, so this comes before the freight rule.
      rule = new Flat(990);
    } else if (!atHome && weightGrams > 5_000) {
      // Heavy parcels abroad go as freight: one flat price.
      rule = new Flat(3_500);
    } else {
      rule = new Cheapest(this.providers);
    }
    return rule.cost(weightGrams, country);
  }
}
