// What it costs to ship a cart.

import { ParcelNowClient } from './vendor/parcelnow.js';
import { SwiftShip } from './vendor/swiftship.js';

export function cartWeightGrams(cart, catalog) {
  let grams = 0;
  for (const [sku, quantity] of cart.lines) {
    grams += catalog.find(sku).weightGrams * quantity;
  }
  return grams;
}

export function shippingCost(cart, catalog, country, paidCents, shop) {
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
  const parcelNowCents = Number(euros) * 100 + Number(cents);
  const swiftShipCents = new SwiftShip().quote({
    grams: weightGrams,
    to: country,
  });
  return Math.min(parcelNowCents, swiftShipCents);
}
