// What it costs to ship a cart.

import type { Cart } from './cart.ts';
import type { Catalog } from './catalog.ts';
import type { Settings } from './settings.ts';

export class NoShippingError extends Error {
  override name = 'NoShippingError';
}

export class UnknownOfferError extends Error {
  override name = 'UnknownOfferError';
}

// Every shipping provider fills this slot: a function of a parcel's
// grams and its country that answers what the parcel costs, in cents.
export type ShippingQuote = (grams: number, country: string) => number;

const FRIDAY = 5; // What a Date's getDay() answers on a Friday: Sunday is 0.
// This year's Black Friday.
export const BLACK_FRIDAY = new Date(2026, 10, 27);

export function cartWeightGrams(cart: Cart, catalog: Catalog): number {
  let grams = 0;
  for (const [sku, quantity] of cart.lines) {
    grams += catalog.find(sku).weightGrams * quantity;
  }
  return grams;
}

// One way the store prices a parcel fills this slot: a function of its
// grams and its country that answers whole cents, the same question a
// provider answers, so cheapest can hand both straight on.
export type ShippingRule = (grams: number, country: string) => number;

// One price for every parcel, whatever it weighs; flat(0) is free.
export function flat(cents: number): ShippingRule {
  return (grams, country) => cents;
}

// Ask every shipping provider, and take the cheapest answer.
export function cheapest(providers: readonly ShippingQuote[]): ShippingRule {
  return (grams, country) => {
    const costs: number[] = [];
    for (const provider of providers) {
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
  };
}

// Every offer fills this slot: a function of the amount paid that says
// whether an order at home ships free.
export type ShippingOffer = (paidCents: number) => boolean;

// On Fridays, orders from fromCents ship free. today is the clock the
// offer reads: main hands in () => new Date(), a test a fixed day.
export function freeFriday(
  fromCents: number,
  today: () => Date,
): ShippingOffer {
  return (paidCents) => today().getDay() === FRIDAY && paidCents >= fromCents;
}

// On one day, every order at home ships free, whatever it costs: Black
// Friday. today is the clock the offer reads, as in freeFriday.
export function freeOn(day: Date, today: () => Date): ShippingOffer {
  return (paidCents) => today().toDateString() === day.toDateString();
}

// A row of OFFERS: a function of the shop's settings and the clock that
// makes the offer its name stands for.
type OfferRow = (shop: Settings, today: () => Date) => ShippingOffer;

// Every offer a shop can name, with the row that makes it. A row takes
// from the shop and the calendar what the maker needs besides the clock.
const OFFERS = new Map<string, OfferRow>([
  [
    'free-friday',
    (shop, today) => freeFriday(shop.freeFridayFromCents, today),
  ],
  ['black-friday', (shop, today) => freeOn(BLACK_FRIDAY, today)],
]);

// Make the offer the shop's settings name, on the clock given.
export function offerFor(shop: Settings, today: () => Date): ShippingOffer {
  const make = OFFERS.get(shop.offerName);
  if (make === undefined) {
    throw new UnknownOfferError(shop.offerName);
  }
  return make(shop, today);
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
      rule = flat(0);
    } else if (atHome && this.offer(paidCents)) {
      // The shop's offer, whichever one main handed in.
      rule = flat(0);
    } else if (country === 'CH') {
      // No provider ships to Switzerland: a courier, one flat price,
      // heavy parcels too, so this comes before the freight rule.
      rule = flat(990);
    } else if (!atHome && weightGrams > 5_000) {
      // Heavy parcels abroad go as freight: one flat price.
      rule = flat(3_500);
    } else {
      rule = cheapest(this.providers);
    }
    return rule(weightGrams, country);
  }
}
