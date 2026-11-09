"""What a cart costs: the subtotal, the discount and the tax."""

import time
from dataclasses import dataclass
from datetime import date

from shopfront.cart import Cart
from shopfront.catalog import Catalog
from shopfront.settings import Settings
from shopfront.vendor.tax_service import TaxService


class UnknownCouponError(Exception):
    pass


@dataclass
class PriceQuote:
    subtotal_cents: int
    discount_cents: int
    tax_cents: int


class PriceCalculator:
    def __init__(
        self, catalog: Catalog, tax_service: TaxService, shop: Settings
    ) -> None:
        self.catalog = catalog
        self.tax_service = tax_service
        self.shop = shop
        self._rates: dict[str, int] = {}

    def subtotal(self, cart: Cart) -> int:
        return sum(
            self.catalog.find(sku).price_cents * quantity
            for sku, quantity in cart.lines.items()
        )

    def discount(
        self, subtotal_cents: int, coupon: str | None, today: date
    ) -> int:
        if coupon == "WELCOME10":
            return subtotal_cents * 10 // 100
        elif coupon == "WINTER15":
            if today.month != 12:
                raise UnknownCouponError("WINTER15 is valid in December")
            return subtotal_cents * 15 // 100
        elif coupon is not None:
            raise UnknownCouponError(coupon)
        elif subtotal_cents >= 10_000:
            return subtotal_cents * 5 // 100
        return 0

    def tax(self, amount_cents: int, country: str) -> int:
        rate = self._rates.get(country)
        if rate is None:
            started = time.perf_counter()
            rate = self.tax_service.rate_for(country)
            took_ms = (time.perf_counter() - started) * 1000
            print(f"tax rate for {country}: {rate}% in {took_ms:.0f} ms")
            self._rates[country] = rate
        return (amount_cents * rate + 50) // 100

    def quote(
        self,
        cart: Cart,
        country: str,
        *,
        today: date,
        coupon: str | None = None,
        vat_id: str | None = None,
    ) -> PriceQuote:
        subtotal_cents = self.subtotal(cart)
        discount_cents = self.discount(subtotal_cents, coupon, today)
        if vat_id is not None and country != self.shop.home_country:
            # A business in another EU country pays the VAT at home.
            tax_cents = 0
        else:
            tax_cents = self.tax(subtotal_cents - discount_cents, country)
        return PriceQuote(subtotal_cents, discount_cents, tax_cents)
