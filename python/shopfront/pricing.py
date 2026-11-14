"""What a cart costs: the subtotal, the discount and the tax."""

from collections.abc import Callable
from dataclasses import dataclass
from datetime import date
from typing import Protocol

from shopfront.cart import Cart
from shopfront.catalog import Catalog
from shopfront.settings import Settings


class UnknownCouponError(Exception):
    pass


# Every coupon fills this slot: a function of the subtotal and the day
# that answers how many cents the coupon takes off.
CouponRule = Callable[[int, date], int]


def percent_off(percent: int) -> CouponRule:
    """A share of the goods, rounded down to the cent."""

    def cents_off(subtotal_cents: int, today: date) -> int:
        return subtotal_cents * percent // 100

    return cents_off


def amount_off(cents: int) -> CouponRule:
    """A fixed sum, but never more than the goods cost."""

    def cents_off(subtotal_cents: int, today: date) -> int:
        return min(cents, subtotal_cents)

    return cents_off


def only_in(month: int, rule: CouponRule) -> CouponRule:
    """The same rule, refused in every other month; 12 is December."""

    def cents_off(subtotal_cents: int, today: date) -> int:
        if today.month != month:
            raise UnknownCouponError("not valid this month")
        return rule(subtotal_cents, today)

    return cents_off


def at_least(cents: int, rule: CouponRule) -> CouponRule:
    """The same rule, refused when the goods cost less than cents."""

    def cents_off(subtotal_cents: int, today: date) -> int:
        if subtotal_cents < cents:
            raise UnknownCouponError("needs a bigger order")
        return rule(subtotal_cents, today)

    return cents_off


# Every code a shopper can type, with the rule it stands for. A new
# coupon is a new row: the discount does not change.
COUPONS: dict[str, CouponRule] = {
    "WELCOME10": percent_off(10),
    "WINTER15": only_in(12, percent_off(15)),
    "GIFT5": amount_off(500),
    "SAVE10": at_least(8_000, amount_off(1_000)),
}


class TaxRates(Protocol):
    """The calculator's slot for tax rates; the tax service fills it."""

    def rate_for(self, country: str) -> int: ...


@dataclass
class PriceQuote:
    subtotal_cents: int
    discount_cents: int
    tax_cents: int


class PriceCalculator:
    def __init__(
        self, catalog: Catalog, tax_service: TaxRates, shop: Settings
    ) -> None:
        self.catalog = catalog
        self.tax_service = tax_service
        self.shop = shop

    def subtotal(self, cart: Cart) -> int:
        return sum(
            self.catalog.find(sku).price_cents * quantity
            for sku, quantity in cart.lines.items()
        )

    def discount(
        self, subtotal_cents: int, coupon: str | None, today: date
    ) -> int:
        # A coupon replaces the discount for big orders: never both.
        if coupon is not None:
            rule = COUPONS.get(coupon)
            if rule is None:
                raise UnknownCouponError(coupon)
            return rule(subtotal_cents, today)
        if subtotal_cents >= 10_000:
            return subtotal_cents * 5 // 100
        return 0

    def tax(self, amount_cents: int, country: str) -> int:
        rate = self.tax_service.rate_for(country)
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
