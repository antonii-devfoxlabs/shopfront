import re
from datetime import date

import pytest

from shopfront.cart import Cart
from shopfront.catalog import starter_catalog
from shopfront.pricing import PriceCalculator
from shopfront.settings import GERMAN_SHOP
from shopfront.taxes import CachedRates, TimedRates
from shopfront.timing import timed
from shopfront.vendor.tax_service import TaxService, TaxServiceError


def test_timed_rates_pass_the_answer_on():
    rates = TimedRates(TaxService(), lambda line: None)
    assert rates.rate_for("PL") == 23


def test_timed_rates_log_each_answer_and_its_time():
    lines: list[str] = []
    rates = TimedRates(TaxService(), lines.append)
    rates.rate_for("DE")
    rates.rate_for("FR")
    assert len(lines) == 2
    assert re.fullmatch(r"tax rate for DE: 19% in \d+ ms", lines[0])
    assert re.fullmatch(r"tax rate for FR: 20% in \d+ ms", lines[1])


def test_cached_rates_ask_once_per_country():
    tax_service = TaxService()
    rates = CachedRates(tax_service)
    answers = [rates.rate_for(country) for country in ("DE", "DE", "FR")]
    assert answers == [19, 19, 20]
    assert tax_service.lookups == 2


def test_a_missing_rate_is_still_an_error_through_both():
    rates = CachedRates(TimedRates(TaxService(), lambda line: None))
    with pytest.raises(TaxServiceError):
        rates.rate_for("US")


def test_three_quotes_through_the_wrappers_ask_once():
    tax_service = TaxService()
    lines: list[str] = []
    taxes = CachedRates(TimedRates(tax_service, lines.append))
    prices = PriceCalculator(starter_catalog(), taxes, GERMAN_SHOP)
    cart = Cart()
    cart.add("MUG-01")
    for _ in range(3):
        quote = prices.quote(cart, "DE", today=date(2026, 6, 15))
        assert quote.tax_cents == 238
    assert tax_service.lookups == 1
    assert len(lines) == 1


def test_every_quote_is_timed_and_only_the_real_lookup():
    # main's order: the quote's timer outside the calculator, the cache
    # outside the tax service's timer. One call cannot show an order;
    # three quotes show both timers.
    lines: list[str] = []
    taxes = CachedRates(TimedRates(TaxService(), lines.append))
    prices = PriceCalculator(starter_catalog(), taxes, GERMAN_SHOP)
    timed_quote = timed("price quote", prices.quote, lines.append)
    cart = Cart()
    cart.add("MUG-01")
    for _ in range(3):
        quote = timed_quote(cart, "DE", today=date(2026, 6, 15))
        assert quote.tax_cents == 238
    assert [re.sub(r" in \d+ ms$", "", line) for line in lines] == [
        "tax rate for DE: 19%",
        "price quote",
        "price quote",
        "price quote",
    ]
