// SwiftShip's SDK: a second shipping provider, cheaper abroad.
// Shopfront does not use it yet. Its API looks nothing like
// ParcelNow's: it takes a parcel object and answers in cents.

const CENTS_PER_100_GRAMS = new Map([
  ['DE', 60],
  ['FR', 70],
  ['NL', 65],
  ['PL', 75],
]);
const MINIMUM_CENTS = 390;

export class SwiftShipError extends Error {
  override name = 'SwiftShipError';
}

export interface SwiftShipParcel {
  grams: number;
  to: string;
}

export class SwiftShip {
  quote(parcel: SwiftShipParcel): number {
    const perHundredGrams = CENTS_PER_100_GRAMS.get(parcel.to);
    if (perHundredGrams === undefined) {
      throw new SwiftShipError(`Unsupported country: ${parcel.to}`);
    }
    const cents = Math.ceil(parcel.grams / 100) * perHundredGrams;
    return Math.max(cents, MINIMUM_CENTS);
  }
}
