// What a cart costs: the subtotal, the discount and the tax.

export class UnknownCouponError extends Error {
  name = 'UnknownCouponError';
}

/**
 * Every coupon fills this slot: a function of the subtotal and the day
 * that answers how many cents the coupon takes off.
 * @callback CouponRule
 * @param {number} subtotalCents
 * @param {Date} today
 * @returns {number}
 */

/**
 * A share of the goods, rounded down to the cent.
 * @param {number} percent
 * @returns {CouponRule}
 */
export function percentOff(percent) {
  return (subtotalCents, today) =>
    Math.floor((subtotalCents * percent) / 100);
}

/**
 * A fixed sum, but never more than the goods cost.
 * @param {number} cents
 * @returns {CouponRule}
 */
export function amountOff(cents) {
  return (subtotalCents, today) => Math.min(cents, subtotalCents);
}

/**
 * The same rule, refused in every other month; 12 is December.
 * @param {number} month
 * @param {CouponRule} rule
 * @returns {CouponRule}
 */
export function onlyIn(month, rule) {
  return (subtotalCents, today) => {
    // getMonth() counts from 0: December is 11.
    if (today.getMonth() + 1 !== month) {
      throw new UnknownCouponError('not valid this month');
    }
    return rule(subtotalCents, today);
  };
}

/**
 * The same rule, refused when the goods cost less than cents.
 * @param {number} cents
 * @param {CouponRule} rule
 * @returns {CouponRule}
 */
export function atLeast(cents, rule) {
  return (subtotalCents, today) => {
    if (subtotalCents < cents) {
      throw new UnknownCouponError('needs a bigger order');
    }
    return rule(subtotalCents, today);
  };
}

/**
 * Every code a shopper can type, with the rule it stands for. A new
 * coupon is a new row: the discount does not change.
 * @type {Map<string, CouponRule>}
 */
const COUPONS = new Map([
  ['WELCOME10', percentOff(10)],
  ['WINTER15', onlyIn(12, percentOff(15))],
  ['GIFT5', amountOff(500)],
  ['SAVE10', amountOff(1_000)],
]);

/**
 * The calculator's slot for tax rates; the tax service fills it.
 * @typedef {object} TaxRates
 * @property {(country: string) => number} rateFor
 */

export class PriceCalculator {
  /**
   * @param {TaxRates} taxService
   */
  constructor(catalog, taxService, shop) {
    this.catalog = catalog;
    this.taxService = taxService;
    this.shop = shop;
  }

  subtotal(cart) {
    let cents = 0;
    for (const [sku, quantity] of cart.lines) {
      cents += this.catalog.find(sku).priceCents * quantity;
    }
    return cents;
  }

  discount(subtotalCents, coupon, today) {
    // A coupon replaces the discount for big orders: never both.
    if (coupon != null) {
      const rule = COUPONS.get(coupon);
      if (rule === undefined) {
        throw new UnknownCouponError(coupon);
      }
      // SAVE10 is only for orders of 80.00 or more.
      if (coupon === 'SAVE10' && subtotalCents < 8_000) {
        throw new UnknownCouponError('needs a bigger order');
      }
      return rule(subtotalCents, today);
    }
    if (subtotalCents >= 10_000) {
      return Math.floor((subtotalCents * 5) / 100);
    }
    return 0;
  }

  tax(amountCents, country) {
    const rate = this.taxService.rateFor(country);
    return Math.floor((amountCents * rate + 50) / 100);
  }

  quote(cart, country, { today, coupon = null, vatId = null }) {
    const subtotalCents = this.subtotal(cart);
    const discountCents = this.discount(subtotalCents, coupon, today);
    // A business in another EU country pays the VAT at home.
    const taxCents =
      vatId !== null && country !== this.shop.homeCountry
        ? 0
        : this.tax(subtotalCents - discountCents, country);
    return { subtotalCents, discountCents, taxCents };
  }
}
