// What a cart costs: the subtotal, the discount and the tax.

import type { Cart } from './cart.ts';
import type { Catalog } from './catalog.ts';
import type { Settings } from './settings.ts';

export class UnknownCouponError extends Error {
  override name = 'UnknownCouponError';
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
    if (coupon === 'WELCOME10') {
      return Math.floor((subtotalCents * 10) / 100);
    } else if (coupon === 'WINTER15') {
      if (today.getMonth() !== 11) {
        throw new UnknownCouponError('WINTER15 is valid in December');
      }
      return Math.floor((subtotalCents * 15) / 100);
    } else if (coupon === 'GIFT5') {
      // Five euros off, but never more than the goods cost.
      return Math.min(500, subtotalCents);
    } else if (coupon !== null) {
      throw new UnknownCouponError(coupon);
    } else if (subtotalCents >= 10_000) {
      return Math.floor((subtotalCents * 5) / 100);
    }
    return 0;
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
