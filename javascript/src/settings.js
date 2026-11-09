// The store's settings, read by every part of Shopfront.

/**
 * Everything that makes one shop different from another.
 * @typedef {object} Settings
 * @property {string} storeName
 * @property {string} storeEmail
 * @property {string} currency
 * @property {string} homeCountry Where the shop ships from: orders
 *   inside this country can ship for free.
 * @property {number} freeShippingFromCents
 * @property {string} parcelNowAccount The accounts the shop uses with
 *   its providers.
 * @property {string} merchantId
 */

/** @type {Settings} */
export const GERMAN_SHOP = Object.freeze({
  storeName: 'Shopfront',
  storeEmail: 'orders@shopfront.example',
  currency: 'EUR',
  homeCountry: 'DE',
  freeShippingFromCents: 5_000,
  parcelNowAccount: 'shopfront',
  merchantId: 'shopfront-store',
});

/** @type {Settings} */
export const DUTCH_SHOP = Object.freeze({
  storeName: 'Shopfront NL',
  storeEmail: 'orders.nl@shopfront.example',
  currency: 'EUR',
  homeCountry: 'NL',
  freeShippingFromCents: 6_000,
  parcelNowAccount: 'shopfront-nl',
  merchantId: 'shopfront-nl',
});

// The settings every part of Shopfront reads.
export let current = GERMAN_SHOP;

// Puts other settings in place for every part, and gives back the
// ones that were there, so a test can put them back.
export function use(settings) {
  const previous = current;
  current = settings;
  return previous;
}
