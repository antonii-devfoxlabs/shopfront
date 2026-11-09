// ParcelNow's SDK: the shipping provider Shopfront uses today.
// Like every module in vendor/, it stands in for a third-party SDK
// and keeps everything in memory.

const BASE_RATES = new Map([
  ['DE', '4.90'],
  ['FR', '8.90'],
  ['NL', '7.90'],
  ['PL', '9.90'],
]);
const PER_EXTRA_KILO = '1.20';

export class ParcelNowError extends Error {
  override name = 'ParcelNowError';
}

export type ParcelNowRate = {
  amount: string;
  currency: 'EUR';
  service: 'standard';
};

export class ParcelNowClient {
  readonly account: string;

  constructor({ account }: { account: string }) {
    this.account = account;
  }

  // The price of one parcel, as ParcelNow's API answers it: a
  // decimal string in euros.
  getRate({
    weightKg,
    destination,
  }: {
    weightKg: number;
    destination: string;
  }): ParcelNowRate {
    const base = BASE_RATES.get(destination);
    if (base === undefined) {
      throw new ParcelNowError(`No service to ${destination}`);
    }
    const extraKilos = Math.max(0, Math.ceil(weightKg) - 1);
    const cents = toCents(base) + extraKilos * toCents(PER_EXTRA_KILO);
    return {
      amount: `${Math.floor(cents / 100)}.${pad(cents % 100)}`,
      currency: 'EUR',
      service: 'standard',
    };
  }
}

function pad(cents: number): string {
  return String(cents).padStart(2, '0');
}

function toCents(amount: string): number {
  const [euros, cents] = amount.split('.');
  return Number(euros) * 100 + Number(cents);
}
