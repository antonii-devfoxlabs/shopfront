// The settings of each shop Shopfront runs.

/**
 * Everything that makes one shop different from another.
 * @typedef {object} Settings
 * @property {string} storeName
 * @property {string} storeEmail
 * @property {string} currency
 * @property {string} homeCountry Where the shop ships from: orders
 *   inside this country can ship for free.
 * @property {number} freeShippingFromCents
 * @property {number} freeFridayFromCents On Free Friday, orders at home
 *   ship free from this line.
 * @property {string} offerName The name of the free-shipping offer the
 *   shop runs.
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
  freeFridayFromCents: 4_000,
  offerName: 'black-friday',
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
  freeFridayFromCents: 5_000,
  offerName: 'free-friday',
  parcelNowAccount: 'shopfront-nl',
  merchantId: 'shopfront-nl',
});
