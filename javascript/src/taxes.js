// Wrappers round the tax rates: each adds one job, and asks the same.
// Each wrapper fills the calculator's slot, TaxRates, and holds another
// object that fills it, its inner one. It does its own job and passes
// the question on, so neither pricing nor the tax service changes.

/** @import { TaxRates } from './pricing.js' */

// Logs each rate and how long the inner rates took to answer.
export class TimedRates {
  /**
   * @param {TaxRates} inner
   * @param {(line: string) => void} log
   */
  constructor(inner, log) {
    this.inner = inner;
    this.log = log;
  }

  rateFor(country) {
    const started = performance.now();
    const rate = this.inner.rateFor(country);
    const tookMs = performance.now() - started;
    this.log(`tax rate for ${country}: ${rate}% in ${tookMs.toFixed(0)} ms`);
    return rate;
  }
}

// Asks the inner rates once per country, then answers from memory.
export class CachedRates {
  #known = new Map();

  /**
   * @param {TaxRates} inner
   */
  constructor(inner) {
    this.inner = inner;
  }

  rateFor(country) {
    let rate = this.#known.get(country);
    if (rate === undefined) {
      rate = this.inner.rateFor(country);
      this.#known.set(country, rate);
    }
    return rate;
  }
}
