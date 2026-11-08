// The tax service's SDK: the standard VAT rate of a country. A
// real one answers over the network, so every call takes a moment;
// this one waits 20 ms to show it, and `lookups` counts the calls.

const STANDARD_RATES = new Map([
  ['DE', 19],
  ['FR', 20],
  ['NL', 21],
  ['PL', 23],
]);
const ANSWER_MILLISECONDS = 20;

export class TaxServiceError extends Error {
  override name = 'TaxServiceError';
}

export class TaxService {
  lookups = 0;

  rateFor(country: string): number {
    this.lookups += 1;
    waitFor(ANSWER_MILLISECONDS);
    const rate = STANDARD_RATES.get(country);
    if (rate === undefined) {
      throw new TaxServiceError(`No VAT rate for ${country}`);
    }
    return rate;
  }
}

// The SDK answers synchronously, so it blocks rather than awaits.
function waitFor(milliseconds: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}
