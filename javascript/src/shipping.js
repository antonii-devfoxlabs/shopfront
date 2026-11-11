// What it costs to ship a cart.

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

const FRIDAY = 5; // What a Date's getDay() answers on a Friday: Sunday is 0.

export function cartWeightGrams(cart, catalog) {
  let grams = 0;
  for (const [sku, quantity] of cart.lines) {
    grams += catalog.find(sku).weightGrams * quantity;
  }
  return grams;
}

/**
 * One way the store prices a parcel fills this slot: a function of its
 * grams and its country that answers whole cents, the same question a
 * provider answers, so cheapest can hand both straight on.
 * @callback ShippingRule
 * @param {number} grams
 * @param {string} country
 * @returns {number}
 */

/**
 * One price for every parcel, whatever it weighs; flat(0) is free.
 * @param {number} cents
 * @returns {ShippingRule}
 */
export function flat(cents) {
  return (grams, country) => cents;
}

/**
 * Ask every shipping provider, and take the cheapest answer.
 * @param {ShippingQuote[]} providers
 * @returns {ShippingRule}
 */
export function cheapest(providers) {
  return (grams, country) => {
    const costs = [];
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

/**
 * Every offer fills this slot: a function of the amount paid that says
 * whether an order at home ships free.
 * @callback ShippingOffer
 * @param {number} paidCents
 * @returns {boolean}
 */

/**
 * On Fridays, orders from fromCents ship free. today is the clock the
 * offer reads: main hands in () => new Date(), a test a fixed day.
 * @param {number} fromCents
 * @param {() => Date} today
 * @returns {ShippingOffer}
 */
export function freeFriday(fromCents, today) {
  return (paidCents) => today().getDay() === FRIDAY && paidCents >= fromCents;
}

/**
 * On one day, every order at home ships free, whatever it costs: Black
 * Friday. today is the clock the offer reads, as in freeFriday.
 * @param {Date} day
 * @param {() => Date} today
 * @returns {ShippingOffer}
 */
export function freeOn(day, today) {
  return (paidCents) => today().toDateString() === day.toDateString();
}

// What one shop charges to ship an order. main hands it the shop, the
// providers and the offer the shop runs; it never picks an offer itself.
export class Shipping {
  /**
   * @param {object} parts
   * @param {ShippingOffer} parts.offer
   * @param {ShippingQuote[]} parts.providers
   * @param {import('./settings.js').Settings} parts.shop
   */
  constructor({ offer, providers, shop }) {
    this.offer = offer;
    this.providers = providers;
    this.shop = shop;
  }

  cost(cart, catalog, country, paidCents) {
    const weightGrams = cartWeightGrams(cart, catalog);
    const atHome = country === this.shop.homeCountry;
    // Pick the rule for this order. The first question that says yes
    // wins, so a rule's place in the list is part of the rule.
    /** @type {ShippingRule} */
    let rule;
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
