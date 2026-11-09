"""What it costs to ship a cart."""

from typing import Protocol

from shopfront.cart import Cart
from shopfront.catalog import Catalog
from shopfront.settings import Settings
from shopfront.vendor.parcelnow import ParcelNowClient
from shopfront.vendor.swiftship import SwiftShip


class ShippingQuote(Protocol):
    def cost(self, grams: int, country: str) -> int:
        """What one parcel costs, in cents."""
        ...


class ParcelNowQuote:
    """ParcelNow's client, made to answer as a ShippingQuote."""

    def __init__(self, client: ParcelNowClient) -> None:
        self.client = client

    def cost(self, grams: int, country: str) -> int:
        rate = self.client.get_rate(grams / 1000, country)
        euros, cents = rate["amount"].split(".")
        return int(euros) * 100 + int(cents)


class SwiftShipQuote:
    """SwiftShip's client, made to answer as a ShippingQuote."""

    def __init__(self, client: SwiftShip) -> None:
        self.client = client

    def cost(self, grams: int, country: str) -> int:
        return self.client.quote({"grams": grams, "to": country})


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
    return min(provider.cost(weight_grams, country) for provider in providers)
