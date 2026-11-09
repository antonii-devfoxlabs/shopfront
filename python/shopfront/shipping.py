"""What it costs to ship a cart."""

from collections.abc import Callable

from shopfront.cart import Cart
from shopfront.catalog import Catalog
from shopfront.settings import Settings
from shopfront.vendor.boxroute import BoxRouteError, estimate
from shopfront.vendor.parcelnow import ParcelNowClient, ParcelNowError
from shopfront.vendor.swiftship import SwiftShip, SwiftShipError


class NoShippingError(Exception):
    pass


# Every shipping provider fills this slot: a function of a parcel's
# grams and its country that answers what the parcel costs, in cents.
ShippingQuote = Callable[[int, str], int]


def parcelnow_quote(client: ParcelNowClient) -> ShippingQuote:
    """ParcelNow's client, made to answer as a ShippingQuote."""

    def cost(grams: int, country: str) -> int:
        try:
            rate = client.get_rate(grams / 1000, country)
        except ParcelNowError as error:
            raise NoShippingError(country) from error
        euros, cents = rate["amount"].split(".")
        return int(euros) * 100 + int(cents)

    return cost


def swiftship_quote(client: SwiftShip) -> ShippingQuote:
    """SwiftShip's client, made to answer as a ShippingQuote."""

    def cost(grams: int, country: str) -> int:
        try:
            return client.quote({"grams": grams, "to": country})
        except SwiftShipError as error:
            raise NoShippingError(country) from error

    return cost


def boxroute_quote(grams: int, country: str) -> int:
    """BoxRoute's estimate, made to answer as a ShippingQuote."""
    try:
        price = estimate(country, grams / 1000)
    except BoxRouteError as error:
        raise NoShippingError(country) from error
    return price["euros"] * 100 + price["cents"]


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
    providers: list[ShippingQuote],
    shop: Settings,
) -> int:
    weight_grams = cart_weight_grams(cart, catalog)
    if country == shop.home_country:
        if paid_cents >= shop.free_shipping_from_cents:
            return 0
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
