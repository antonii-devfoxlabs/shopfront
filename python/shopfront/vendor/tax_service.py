"""The tax service's SDK: the standard VAT rate of a country.

A real one answers over the network, so every call takes a moment;
this one waits 20 ms to show it, and `lookups` counts the calls. Like
a real one, it waits for an answer at most `timeout_seconds`, then
gives up with TaxServiceTimeoutError: a timeout shorter than its
20 ms plays a day the service is too slow to answer.
"""

import time

_STANDARD_RATES = {"DE": 19, "FR": 20, "NL": 21, "PL": 23}
_ANSWER_SECONDS = 0.02


class TaxServiceError(Exception):
    pass


class TaxServiceTimeoutError(TaxServiceError):
    """No answer in time. Asked again, the service may answer."""


class TaxService:
    def __init__(self, timeout_seconds: float = 10.0) -> None:
        self.lookups = 0
        self.timeout_seconds = timeout_seconds

    def rate_for(self, country: str) -> int:
        self.lookups += 1
        if _ANSWER_SECONDS > self.timeout_seconds:
            time.sleep(self.timeout_seconds)
            raise TaxServiceTimeoutError(
                f"No answer in {self.timeout_seconds} s"
            )
        time.sleep(_ANSWER_SECONDS)
        if country not in _STANDARD_RATES:
            raise TaxServiceError(f"No VAT rate for {country}")
        return _STANDARD_RATES[country]
