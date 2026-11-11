"""What it costs to ship a cart."""

from collections.abc import Callable
from dataclasses import dataclass
from datetime import date

from shopfront.cart import Cart
from shopfront.catalog import Catalog
from shopfront.settings import Settings


class NoShippingError(Exception):
    pass


class UnknownOfferError(Exception):
    pass


# Every shipping provider fills this slot: a function of a parcel's
# grams and its country that answers what the parcel costs, in cents.
ShippingQuote = Callable[[int, str], int]

FRIDAY = 4  # What date.weekday() answers on a Friday: Monday is 0.
# This year's Black Friday.
BLACK_FRIDAY = date(2026, 11, 27)


def cart_weight_grams(cart: Cart, catalog: Catalog) -> int:
    return sum(
        catalog.find(sku).weight_grams * quantity
        for sku, quantity in cart.lines.items()
    )


# One way the store prices a parcel fills this slot: a function of its
# grams and its country that answers whole cents, the same question a
# provider answers, so cheapest can hand both straight on.
ShippingRule = Callable[[int, str], int]


def flat(cents: int) -> ShippingRule:
    """One price for every parcel, whatever it weighs; flat(0) is free."""

    def cost(grams: int, country: str) -> int:
        return cents

    return cost


def cheapest(providers: list[ShippingQuote]) -> ShippingRule:
    """Ask every shipping provider, and take the cheapest answer."""

    def cost(grams: int, country: str) -> int:
        costs = []
        for provider in providers:
            try:
                costs.append(provider(grams, country))
            except NoShippingError:
                # This provider does not ship there: ask the others.
                continue
        if not costs:
            raise NoShippingError(country)
        return min(costs)

    return cost


# Every offer fills this slot: a function of the amount paid that says
# whether an order at home ships free.
ShippingOffer = Callable[[int], bool]


def free_friday(from_cents: int, today: Callable[[], date]) -> ShippingOffer:
    """On Fridays, orders from from_cents ship free. today is the clock
    the offer reads: main hands in date.today, a test a fixed day."""

    def ships_free(paid_cents: int) -> bool:
        return today().weekday() == FRIDAY and paid_cents >= from_cents

    return ships_free


def free_on(day: date, today: Callable[[], date]) -> ShippingOffer:
    """On one day, every order at home ships free, whatever it costs:
    Black Friday. today is the clock the offer reads, as in free_friday."""

    def ships_free(paid_cents: int) -> bool:
        return today() == day

    return ships_free


@dataclass(frozen=True, kw_only=True)
class Shipping:
    """What one shop charges to ship an order. main hands it the shop,
    the providers and the offer the shop runs; it never picks an offer
    itself."""

    offer: ShippingOffer
    providers: list[ShippingQuote]
    shop: Settings

    def cost(
        self, cart: Cart, catalog: Catalog, country: str, paid_cents: int
    ) -> int:
        weight_grams = cart_weight_grams(cart, catalog)
        at_home = country == self.shop.home_country
        # Pick the rule for this order. The first question that says yes
        # wins, so a rule's place in the list is part of the rule.
        rule: ShippingRule
        if at_home and paid_cents >= self.shop.free_shipping_from_cents:
            rule = flat(0)
        elif at_home and self.offer(paid_cents):
            # The shop's offer, whichever one main handed in.
            rule = flat(0)
        elif country == "CH":
            # No provider ships to Switzerland: a courier, one flat price,
            # heavy parcels too, so this comes before the freight rule.
            rule = flat(990)
        elif not at_home and weight_grams > 5_000:
            # Heavy parcels abroad go as freight: one flat price.
            rule = flat(3_500)
        else:
            rule = cheapest(self.providers)
        return rule(weight_grams, country)
