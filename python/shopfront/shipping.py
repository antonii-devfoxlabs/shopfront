"""What it costs to ship a cart."""

from collections.abc import Callable
from dataclasses import dataclass
from datetime import date
from typing import Protocol

from shopfront.cart import Cart
from shopfront.catalog import Catalog
from shopfront.settings import Settings


class NoShippingError(Exception):
    pass


# Every shipping provider fills this slot: a function of a parcel's
# grams and its country that answers what the parcel costs, in cents.
ShippingQuote = Callable[[int, str], int]

FRIDAY = 4  # What date.weekday() answers on a Friday: Monday is 0.


def cart_weight_grams(cart: Cart, catalog: Catalog) -> int:
    return sum(
        catalog.find(sku).weight_grams * quantity
        for sku, quantity in cart.lines.items()
    )


class ShippingRule(Protocol):
    """One way the store prices a parcel: its grams and its country in,
    whole cents out."""

    def cost(self, grams: int, country: str) -> int: ...


@dataclass(frozen=True)
class Flat:
    """One price for every parcel, whatever it weighs; Flat(0) is free."""

    cents: int

    def cost(self, grams: int, country: str) -> int:
        return self.cents


@dataclass(frozen=True)
class Cheapest:
    """Ask every shipping provider, and take the cheapest answer."""

    providers: list[ShippingQuote]

    def cost(self, grams: int, country: str) -> int:
        costs = []
        for provider in self.providers:
            try:
                costs.append(provider(grams, country))
            except NoShippingError:
                # This provider does not ship there: ask the others.
                continue
        if not costs:
            raise NoShippingError(country)
        return min(costs)


class ShippingOffer(Protocol):
    """An offer that lets an order at home ship free: the amount paid in,
    yes or no out."""

    def ships_free(self, paid_cents: int) -> bool: ...


@dataclass(frozen=True)
class FreeFriday:
    """On Fridays, orders from from_cents ship free. today is the clock
    the offer reads: main hands in date.today, a test a fixed day."""

    from_cents: int
    today: Callable[[], date]

    def ships_free(self, paid_cents: int) -> bool:
        return (
            self.today().weekday() == FRIDAY and paid_cents >= self.from_cents
        )


def shipping_cost(
    cart: Cart,
    catalog: Catalog,
    country: str,
    paid_cents: int,
    today: date,
    providers: list[ShippingQuote],
    shop: Settings,
) -> int:
    weight_grams = cart_weight_grams(cart, catalog)
    at_home = country == shop.home_country
    # Pick the rule for this order. The first question that says yes
    # wins, so a rule's place in the list is part of the rule.
    rule: ShippingRule
    if at_home and paid_cents >= shop.free_shipping_from_cents:
        rule = Flat(0)
    elif (
        at_home
        and today.weekday() == FRIDAY
        and paid_cents >= shop.free_friday_from_cents
    ):
        # Free Friday: at home, orders from the shop's Friday line.
        rule = Flat(0)
    elif country == "CH":
        # No provider ships to Switzerland: a courier, one flat price,
        # heavy parcels too, so this comes before the freight rule.
        rule = Flat(990)
    elif not at_home and weight_grams > 5_000:
        # Heavy parcels abroad go as freight: one flat price.
        rule = Flat(3_500)
    else:
        rule = Cheapest(providers)
    return rule.cost(weight_grams, country)
