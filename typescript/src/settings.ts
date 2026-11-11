// The settings of each shop Shopfront runs.

// Everything that makes one shop different from another.
export type Settings = {
  readonly storeName: string;
  readonly storeEmail: string;
  readonly currency: string;
  // Where the shop ships from: orders inside this country can ship
  // for free.
  readonly homeCountry: string;
  readonly freeShippingFromCents: number;
  // On Free Friday, orders at home ship free from this line.
  readonly freeFridayFromCents: number;
  // The name of the free-shipping offer the shop runs.
  readonly offerName: string;
  // The warehouse's phone: it is texted what to pack.
  readonly warehousePhone: string;
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
  freeFridayFromCents: 4_000,
  offerName: 'black-friday',
  warehousePhone: '+44 7700 900100',
  parcelNowAccount: 'shopfront',
  merchantId: 'shopfront-store',
});

export const DUTCH_SHOP: Settings = Object.freeze({
  storeName: 'Shopfront NL',
  storeEmail: 'orders.nl@shopfront.example',
  currency: 'EUR',
  homeCountry: 'NL',
  freeShippingFromCents: 6_000,
  freeFridayFromCents: 5_000,
  offerName: 'free-friday',
  warehousePhone: '+44 7700 900200',
  parcelNowAccount: 'shopfront-nl',
  merchantId: 'shopfront-nl',
});
