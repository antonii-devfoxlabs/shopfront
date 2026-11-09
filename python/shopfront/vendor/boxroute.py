"""BoxRoute's SDK: a third shipping provider, cheapest for Poland.

It is one function, not a class: there is no client to create. It
takes the weight in kilos and answers in euros and cents, apart.
"""

import math

_BASE_CENTS = {"DE": 690, "FR": 990, "NL": 990, "PL": 450}
_PER_EXTRA_KILO_CENTS = 100


class BoxRouteError(Exception):
    pass


def estimate(destination: str, kilos: float) -> dict:
    if destination not in _BASE_CENTS:
        raise BoxRouteError(f"No route to {destination}")
    extra_kilos = max(0, math.ceil(kilos) - 1)
    cents = _BASE_CENTS[destination] + extra_kilos * _PER_EXTRA_KILO_CENTS
    return {"euros": cents // 100, "cents": cents % 100}
