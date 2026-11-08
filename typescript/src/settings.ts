// The store's settings, read by every part of Shopfront.

export const settings = {
  storeName: 'Shopfront',
  storeEmail: 'orders@shopfront.example',
  currency: 'EUR',

  // Where the store ships from: orders inside this country can
  // ship for free.
  homeCountry: 'DE',
  freeShippingFromCents: 5_000,

  // The accounts Shopfront uses with its providers.
  parcelNowAccount: 'shopfront',
  merchantId: 'shopfront-store',
};
