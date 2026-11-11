// What a cart costs: the subtotal, the discount and the tax.

import type { Cart } from './cart.ts';
import type { Catalog } from './catalog.ts';
import type { Settings } from './settings.ts';

export class UnknownCouponError extends Error {
  override name = 'UnknownCouponError';
}

// Every coupon fills this slot: a function of the subtotal and the day
// that answers how many cents the coupon takes off.
export type CouponRule = (subtotalCents: number, today: Date) => number;

// A share of the goods, rounded down to the cent.
export function percentOff(percent: number): CouponRule {
  return (subtotalCents, today) =>
    Math.floor((subtotalCents * percent) / 100);
}

// A fixed sum, but never more than the goods cost.
export function amountOff(cents: number): CouponRule {
  return (subtotalCents, today) => Math.min(cents, subtotalCents);
}

// The same rule, refused in every other month; 12 is December.
export function onlyIn(month: number, rule: CouponRule): CouponRule {
  return (subtotalCents, today) => {
    // getMonth() counts from 0: December is 11.
    if (today.getMonth() + 1 !== month) {
      throw new UnknownCouponError('not valid this month');
    }
    return rule(subtotalCents, today);
  };
}

// The calculator's slot for tax rates; the tax service fills it.
export interface TaxRates {
  rateFor(country: string): number;
}

export type PriceQuote = {
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
};

export type QuoteOptions = {
  today: Date;
  coupon?: string | null;
  vatId?: string | null;
};

export class PriceCalculator {
  readonly catalog: Catalog;
  readonly taxService: TaxRates;
  readonly shop: Settings;

  constructor(catalog: Catalog, taxService: TaxRates, shop: Settings) {
    this.catalog = catalog;
    this.taxService = taxService;
    this.shop = shop;
  }

  subtotal(cart: Cart): number {
    let cents = 0;
    for (const [sku, quantity] of cart.lines) {
      cents += this.catalog.find(sku).priceCents * quantity;
    }
    return cents;
  }

  discount(
    subtotalCents: number,
    coupon: string | null,
    today: Date,
  ): number {
    let rule: CouponRule;
    if (coupon === 'WELCOME10') {
      rule = percentOff(10);
    } else if (coupon === 'WINTER15') {
      rule = onlyIn(12, percentOff(15));
    } else if (coupon === 'GIFT5') {
      rule = amountOff(500);
    } else if (coupon !== null) {
      throw new UnknownCouponError(coupon);
    } else if (subtotalCents >= 10_000) {
      return Math.floor((subtotalCents * 5) / 100);
    } else {
      return 0;
    }
    return rule(subtotalCents, today);
  }

  tax(amountCents: number, country: string): number {
    const rate = this.taxService.rateFor(country);
    return Math.floor((amountCents * rate + 50) / 100);
  }

  quote(
    cart: Cart,
    country: string,
    { today, coupon = null, vatId = null }: QuoteOptions,
  ): PriceQuote {
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
