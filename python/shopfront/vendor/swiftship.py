"""SwiftShip's SDK: a second shipping provider, cheaper for light parcels.

Its API looks nothing like ParcelNow's: it takes a parcel as a
dictionary and answers in cents.
"""

import math

_CENTS_PER_100_GRAMS = {"AT": 80, "DE": 60, "FR": 70, "NL": 65, "PL": 75}
_MINIMUM_CENTS = 390


class SwiftShipError(Exception):
    pass


class SwiftShip:
    def quote(self, parcel: dict) -> int:
        country = parcel["to"]
        if country not in _CENTS_PER_100_GRAMS:
            raise SwiftShipError(f"Unsupported country: {country}")
        hundreds_of_grams = math.ceil(parcel["grams"] / 100)
        cents = hundreds_of_grams * _CENTS_PER_100_GRAMS[country]
        return max(cents, _MINIMUM_CENTS)
