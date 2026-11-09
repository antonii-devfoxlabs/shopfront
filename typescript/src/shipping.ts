// What it costs to ship a cart.

import type { Cart } from './cart.ts';
import type { Catalog } from './catalog.ts';
import type { Settings } from './settings.ts';
import { ParcelNowClient } from './vendor/parcelnow.ts';

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
  shop: Settings,
): number {
  const weightGrams = cartWeightGrams(cart, catalog);
  if (country === shop.homeCountry) {
    if (paidCents >= shop.freeShippingFromCents) return 0;
  } else if (weightGrams > 5_000) {
    // Heavy parcels abroad go as freight: one flat price.
    return 3_500;
  }
  const client = new ParcelNowClient({
    account: shop.parcelNowAccount,
  });
  const rate = client.getRate({
    weightKg: weightGrams / 1000,
    destination: country,
  });
  const [euros, cents] = rate.amount.split('.');
  return Number(euros) * 100 + Number(cents);
}
