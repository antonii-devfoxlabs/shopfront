// The parcels the warehouse hands to couriers, and who carries them.

// A courier the warehouse hands parcels to.
export type Courier = {
  readonly name: string;
  // The courier's tracking page: a parcel's number goes at its end.
  readonly trackingPage: string;
};

// What the warehouse handed a courier for one order.
export class Parcel {
  readonly courier: Courier;
  // The courier's own number for the parcel.
  readonly number: string;

  constructor({ courier, number }: { courier: Courier; number: string }) {
    this.courier = courier;
    this.number = number;
    Object.freeze(this);
  }
}

export const PARCELNOW: Courier = Object.freeze({
  name: 'ParcelNow',
  trackingPage: 'https://parcelnow.example/track/',
});

export const SWIFTSHIP: Courier = Object.freeze({
  name: 'SwiftShip',
  trackingPage: 'https://swiftship.example/t/',
});
