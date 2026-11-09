"""Wrappers round the tax rates: each adds one job, and asks the same.

Each wrapper fills the calculator's slot, TaxRates, and holds another
object that fills it, its inner one. It does its own job and passes
the question on, so neither pricing nor the tax service changes.
"""

import time
from collections.abc import Callable

from shopfront.pricing import TaxRates


class TimedRates:
    """Logs each rate and how long the inner rates took to answer."""

    def __init__(self, inner: TaxRates, log: Callable[[str], None]) -> None:
        self.inner = inner
        self.log = log

    def rate_for(self, country: str) -> int:
        started = time.perf_counter()
        rate = self.inner.rate_for(country)
        took_ms = (time.perf_counter() - started) * 1000
        self.log(f"tax rate for {country}: {rate}% in {took_ms:.0f} ms")
        return rate


class CachedRates:
    """Asks the inner rates once per country, then answers from memory."""

    def __init__(self, inner: TaxRates) -> None:
        self.inner = inner
        self._known: dict[str, int] = {}

    def rate_for(self, country: str) -> int:
        rate = self._known.get(country)
        if rate is None:
            rate = self.inner.rate_for(country)
            self._known[country] = rate
        return rate
