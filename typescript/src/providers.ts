// The edge: every shipping provider's SDK, made to fit ShippingQuote.
// This is the only module that names a shipping provider's SDK. Each
// adapter converts Shopfront's question into its SDK's call, the answer
// into cents, and the SDK's "we do not ship there" into NoShippingError.

import { NoShippingError, type ShippingQuote } from './shipping.ts';
import { BoxRouteError, estimate } from './vendor/boxroute.ts';
import { type ParcelNowClient, ParcelNowError } from './vendor/parcelnow.ts';
import { type SwiftShip, SwiftShipError } from './vendor/swiftship.ts';

// ParcelNow's client, made to answer as a ShippingQuote.
export function parcelNowQuote(client: ParcelNowClient): ShippingQuote {
  return (grams, country) => {
    try {
      const rate = client.getRate({
        weightKg: grams / 1000,
        destination: country,
      });
      const [euros, cents] = rate.amount.split('.');
      return Number(euros) * 100 + Number(cents);
    } catch (error) {
      if (error instanceof ParcelNowError) {
        throw new NoShippingError(country, { cause: error });
      }
      throw error;
    }
  };
}

// SwiftShip's client, made to answer as a ShippingQuote.
export function swiftShipQuote(client: SwiftShip): ShippingQuote {
  return (grams, country) => {
    try {
      return client.quote({ grams, to: country });
    } catch (error) {
      if (error instanceof SwiftShipError) {
        throw new NoShippingError(country, { cause: error });
      }
      throw error;
    }
  };
}

// BoxRoute's estimate, made to answer as a ShippingQuote.
export function boxRouteQuote(grams: number, country: string): number {
  try {
    const price = estimate({ destination: country, kilos: grams / 1000 });
    return price.euros * 100 + price.cents;
  } catch (error) {
    if (error instanceof BoxRouteError) {
      throw new NoShippingError(country, { cause: error });
    }
    throw error;
  }
}
