"""What it costs to ship a cart."""

from collections.abc import Callable
from datetime import date

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
    if country == shop.home_country:
        if paid_cents >= shop.free_shipping_from_cents:
            return 0
        if today.weekday() == FRIDAY and paid_cents >= 4_000:
            # Free Friday: at home, orders from 40.00 EUR ship free.
            return 0
    elif country == "CH":
        # No provider ships to Switzerland: a courier, one flat price,
        # heavy parcels too, so this comes before the freight rule.
        return 990
    elif weight_grams > 5_000:
        # Heavy parcels abroad go as freight: one flat price.
        return 3_500
    costs = []
    for provider in providers:
        try:
            costs.append(provider(weight_grams, country))
        except NoShippingError:
            # This provider does not ship there: ask the others.
            continue
    if not costs:
        raise NoShippingError(country)
    return min(costs)
