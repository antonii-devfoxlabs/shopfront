from datetime import date

import pytest

from shopfront.cart import Cart
from shopfront.catalog import starter_catalog
from shopfront.pricing import PriceCalculator, UnknownCouponError
from shopfront.vendor.tax_service import TaxService, TaxServiceError

A_JUNE_DAY = date(2026, 6, 15)
A_DECEMBER_DAY = date(2026, 12, 10)


def calculator() -> PriceCalculator:
    return PriceCalculator(starter_catalog(), TaxService())


def cart_of(lines: dict[str, int]) -> Cart:
    cart = Cart()
    for sku, quantity in lines.items():
        cart.add(sku, quantity)
    return cart


def test_subtotal_adds_every_line():
    assert calculator().subtotal(cart_of({"MUG-01": 2, "TEA-02": 1})) == 3_390


def test_welcome_coupon_takes_ten_percent():
    assert calculator().discount(3_390, "WELCOME10", A_JUNE_DAY) == 339


def test_winter_coupon_only_in_december():
    assert calculator().discount(10_000, "WINTER15", A_DECEMBER_DAY) == 1_500
    with pytest.raises(UnknownCouponError):
        calculator().discount(10_000, "WINTER15", A_JUNE_DAY)


def test_big_orders_get_five_percent_without_a_coupon():
    assert calculator().discount(10_000, None, A_JUNE_DAY) == 500
    assert calculator().discount(9_999, None, A_JUNE_DAY) == 0


def test_an_unknown_coupon_is_an_error():
    with pytest.raises(UnknownCouponError):
        calculator().discount(3_390, "FREE100", A_JUNE_DAY)


def test_tax_is_the_country_rate_rounded_to_the_cent():
    assert calculator().tax(3_051, "DE") == 580
    assert calculator().tax(3_051, "PL") == 702


def test_a_quote_puts_it_together():
    quote = calculator().quote(
        cart_of({"MUG-01": 2, "TEA-02": 1}), "DE", "WELCOME10", A_JUNE_DAY
    )
    assert (quote.subtotal_cents, quote.discount_cents) == (3_390, 339)
    assert quote.tax_cents == 580


def test_a_business_abroad_pays_no_vat():
    quote = calculator().quote(
        cart_of({"MUG-01": 40}), "FR", None, A_JUNE_DAY, "FR12345678901"
    )
    assert quote.tax_cents == 0


def test_a_business_at_home_pays_vat():
    quote = calculator().quote(
        cart_of({"MUG-01": 40}), "DE", None, A_JUNE_DAY, "DE123456789"
    )
    assert quote.tax_cents == 9_025


def test_every_quote_asks_the_tax_service_again():
    tax_service = TaxService()
    prices = PriceCalculator(starter_catalog(), tax_service)
    for _ in range(3):
        prices.quote(cart_of({"MUG-01": 1}), "DE", None, A_JUNE_DAY)
    assert tax_service.lookups == 3


def test_a_country_without_a_vat_rate_is_an_error():
    with pytest.raises(TaxServiceError):
        calculator().tax(1_000, "US")
