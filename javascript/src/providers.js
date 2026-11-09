// The edge: every shipping provider's SDK, made to fit ShippingQuote.
// This is the only module that calls a shipping provider's SDK. Each
// adapter converts Shopfront's question into its SDK's call, the answer
// into cents, and the SDK's "we do not ship there" into NoShippingError.

/** @import { ShippingQuote } from './shipping.js' */

import { NoShippingError } from './shipping.js';
import { BoxRouteError, estimate } from './vendor/boxroute.js';
import { ParcelNowError } from './vendor/parcelnow.js';
import { SwiftShipError } from './vendor/swiftship.js';

/**
 * ParcelNow's client, made to answer as a ShippingQuote.
 * @returns {ShippingQuote}
 */
export function parcelNowQuote(client) {
  return (grams, country) => {
    try {
      const started = performance.now();
      const rate = client.getRate({
        weightKg: grams / 1000,
        destination: country,
      });
      const tookMs = performance.now() - started;
      console.log(`parcelnow quote in ${tookMs.toFixed(0)} ms`);
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

/**
 * SwiftShip's client, made to answer as a ShippingQuote.
 * @returns {ShippingQuote}
 */
export function swiftShipQuote(client) {
  return (grams, country) => {
    try {
      const started = performance.now();
      const cents = client.quote({ grams, to: country });
      const tookMs = performance.now() - started;
      console.log(`swiftship quote in ${tookMs.toFixed(0)} ms`);
      return cents;
    } catch (error) {
      if (error instanceof SwiftShipError) {
        throw new NoShippingError(country, { cause: error });
      }
      throw error;
    }
  };
}

/**
 * BoxRoute's estimate, made to answer as a ShippingQuote.
 * @type {ShippingQuote}
 */
export function boxRouteQuote(grams, country) {
  try {
    const started = performance.now();
    const price = estimate({ destination: country, kilos: grams / 1000 });
    const tookMs = performance.now() - started;
    console.log(`boxroute quote in ${tookMs.toFixed(0)} ms`);
    return price.euros * 100 + price.cents;
  } catch (error) {
    if (error instanceof BoxRouteError) {
      throw new NoShippingError(country, { cause: error });
    }
    throw error;
  }
}
