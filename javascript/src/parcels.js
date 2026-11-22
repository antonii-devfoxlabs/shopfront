// The parcels the warehouse hands to couriers, and who carries them.

/**
 * A courier the warehouse hands parcels to.
 * @typedef {object} Courier
 * @property {string} name
 * @property {string} trackingPage The courier's tracking page: a
 *   parcel's number goes at its end.
 */

// What the warehouse handed a courier for one order.
export class Parcel {
  /**
   * @param {{ courier: Courier, number: string }} parts
   */
  constructor({ courier, number }) {
    this.courier = courier;
    // The courier's own number for the parcel.
    this.number = number;
    Object.freeze(this);
  }

  // Where anyone can follow the parcel: the courier's page for it.
  trackingLink() {
    return `${this.courier.trackingPage}${this.number}`;
  }
}

/** @type {Courier} */
export const PARCELNOW = Object.freeze({
  name: 'ParcelNow',
  trackingPage: 'https://parcelnow.example/track/',
});

/** @type {Courier} */
export const SWIFTSHIP = Object.freeze({
  name: 'SwiftShip',
  trackingPage: 'https://swiftship.example/t/',
});
