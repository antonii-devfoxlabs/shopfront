"""The tax service's SDK: the standard VAT rate of a country.

A real one answers over the network, so every call takes a moment;
this one waits 20 ms to show it, and `lookups` counts the calls.
"""

import time

_STANDARD_RATES = {"DE": 19, "FR": 20, "NL": 21, "PL": 23}
_ANSWER_SECONDS = 0.02


class TaxServiceError(Exception):
    pass


class TaxService:
    def __init__(self) -> None:
        self.lookups = 0

    def rate_for(self, country: str) -> int:
        self.lookups += 1
        time.sleep(_ANSWER_SECONDS)
        if country not in _STANDARD_RATES:
            raise TaxServiceError(f"No VAT rate for {country}")
        return _STANDARD_RATES[country]
