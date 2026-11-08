// What it costs to ship a cart.

import { settings } from './settings.js';
import { ParcelNowClient } from './vendor/parcelnow.js';

export function cartWeightGrams(cart, catalog) {
  let grams = 0;
  for (const [sku, quantity] of cart.lines) {
    grams += catalog.find(sku).weightGrams * quantity;
  }
  return grams;
}

export function shippingCost(cart, catalog, country, paidCents) {
  const weightGrams = cartWeightGrams(cart, catalog);
  if (country === settings.homeCountry) {
    if (paidCents >= settings.freeShippingFromCents) return 0;
  } else if (weightGrams > 5_000) {
    // Heavy parcels abroad go as freight: one flat price.
    return 3_500;
  }
  const client = new ParcelNowClient({
    account: settings.parcelNowAccount,
  });
  const rate = client.getRate({
    weightKg: weightGrams / 1000,
    destination: country,
  });
  const [euros, cents] = rate.amount.split('.');
  return Number(euros) * 100 + Number(cents);
}
