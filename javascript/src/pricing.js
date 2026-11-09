// What a cart costs: the subtotal, the discount and the tax.

import { settings } from './settings.js';

export class UnknownCouponError extends Error {
  name = 'UnknownCouponError';
}

export class PriceCalculator {
  constructor(catalog, taxService) {
    this.catalog = catalog;
    this.taxService = taxService;
  }

  subtotal(cart) {
    let cents = 0;
    for (const [sku, quantity] of cart.lines) {
      cents += this.catalog.find(sku).priceCents * quantity;
    }
    return cents;
  }

  discount(subtotalCents, coupon, today) {
    if (coupon === 'WELCOME10') {
      return Math.floor((subtotalCents * 10) / 100);
    } else if (coupon === 'WINTER15') {
      if (today.getMonth() !== 11) {
        throw new UnknownCouponError('WINTER15 is valid in December');
      }
      return Math.floor((subtotalCents * 15) / 100);
    } else if (coupon != null) {
      throw new UnknownCouponError(coupon);
    } else if (subtotalCents >= 10_000) {
      return Math.floor((subtotalCents * 5) / 100);
    }
    return 0;
  }

  tax(amountCents, country) {
    const rate = this.taxService.rateFor(country);
    return Math.floor((amountCents * rate + 50) / 100);
  }

  quote(cart, country, coupon, today, vatId = null) {
    const subtotalCents = this.subtotal(cart);
    const discountCents = this.discount(subtotalCents, coupon, today);
    // A business in another EU country pays the VAT at home.
    const taxCents =
      vatId !== null && country !== settings.homeCountry
        ? 0
        : this.tax(subtotalCents - discountCents, country);
    return { subtotalCents, discountCents, taxCents };
  }
}
