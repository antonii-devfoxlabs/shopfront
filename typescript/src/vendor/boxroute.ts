// BoxRoute's SDK: a third shipping provider, cheapest for Poland. It
// is one function, not a class: there is no client to create. It
// takes the weight in kilos and answers in euros and cents, apart.

const BASE_CENTS = new Map([
  ['DE', 690],
  ['FR', 990],
  ['NL', 990],
  ['PL', 450],
]);
const PER_EXTRA_KILO_CENTS = 100;

export class BoxRouteError extends Error {
  override name = 'BoxRouteError';
}

export type BoxRoutePrice = {
  euros: number;
  cents: number;
};

export function estimate({
  destination,
  kilos,
}: {
  destination: string;
  kilos: number;
}): BoxRoutePrice {
  const base = BASE_CENTS.get(destination);
  if (base === undefined) {
    throw new BoxRouteError(`No route to ${destination}`);
  }
  const extraKilos = Math.max(0, Math.ceil(kilos) - 1);
  const cents = base + extraKilos * PER_EXTRA_KILO_CENTS;
  return { euros: Math.floor(cents / 100), cents: cents % 100 };
}
