// The store's settings, read by every part of Shopfront.

// Everything that makes one shop different from another.
export type Settings = {
  readonly storeName: string;
  readonly storeEmail: string;
  readonly currency: string;
  // Where the shop ships from: orders inside this country can ship
  // for free.
  readonly homeCountry: string;
  readonly freeShippingFromCents: number;
  // The accounts the shop uses with its providers.
  readonly parcelNowAccount: string;
  readonly merchantId: string;
};

export const GERMAN_SHOP: Settings = Object.freeze({
  storeName: 'Shopfront',
  storeEmail: 'orders@shopfront.example',
  currency: 'EUR',
  homeCountry: 'DE',
  freeShippingFromCents: 5_000,
  parcelNowAccount: 'shopfront',
  merchantId: 'shopfront-store',
});

export const DUTCH_SHOP: Settings = Object.freeze({
  storeName: 'Shopfront NL',
  storeEmail: 'orders.nl@shopfront.example',
  currency: 'EUR',
  homeCountry: 'NL',
  freeShippingFromCents: 6_000,
  parcelNowAccount: 'shopfront-nl',
  merchantId: 'shopfront-nl',
});

// The settings every part of Shopfront reads.
export let current: Settings = GERMAN_SHOP;

// Puts other settings in place for every part, and gives back the
// ones that were there, so a test can put them back.
export function use(settings: Settings): Settings {
  const previous = current;
  current = settings;
  return previous;
}
