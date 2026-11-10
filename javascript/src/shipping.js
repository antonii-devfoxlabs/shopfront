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
 * One way the store prices a parcel: its grams and its country in, whole
 * cents out.
 * @typedef {object} ShippingRule
 * @property {(grams: number, country: string) => number} cost
 */

// One price for every parcel, whatever it weighs; new Flat(0) is free.
export class Flat {
  constructor(cents) {
    this.cents = cents;
  }

  cost(grams, country) {
    return this.cents;
  }
}

// Ask every shipping provider, and take the cheapest answer.
export class Cheapest {
  /** @param {ShippingQuote[]} providers */
  constructor(providers) {
    this.providers = providers;
  }

  cost(grams, country) {
    const costs = [];
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

/** @param {ShippingQuote[]} providers */
export function shippingCost(
  cart,
  catalog,
  country,
  paidCents,
  today,
  providers,
  shop,
) {
  const weightGrams = cartWeightGrams(cart, catalog);
  const atHome = country === shop.homeCountry;
  // Pick the rule for this order. The first question that says yes
  // wins, so a rule's place in the list is part of the rule.
  /** @type {ShippingRule} */
  let rule;
  if (atHome && paidCents >= shop.freeShippingFromCents) {
    rule = new Flat(0);
  } else if (
    atHome &&
    today.getDay() === FRIDAY &&
    paidCents >= shop.freeFridayFromCents
  ) {
    // Free Friday: at home, orders from the shop's Friday line.
    rule = new Flat(0);
  } else if (country === 'CH') {
    // No provider ships to Switzerland: a courier, one flat price,
    // heavy parcels too, so this comes before the freight rule.
    rule = new Flat(990);
  } else if (!atHome && weightGrams > 5_000) {
    // Heavy parcels abroad go as freight: one flat price.
    rule = new Flat(3_500);
  } else {
    rule = new Cheapest(providers);
  }
  return rule.cost(weightGrams, country);
}
