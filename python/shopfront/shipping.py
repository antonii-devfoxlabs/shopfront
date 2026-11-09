"""What it costs to ship a cart."""

from shopfront.cart import Cart
from shopfront.catalog import Catalog
from shopfront.settings import Settings
from shopfront.vendor.parcelnow import ParcelNowClient
from shopfront.vendor.swiftship import SwiftShip


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
    shop: Settings,
) -> int:
    weight_grams = cart_weight_grams(cart, catalog)
    if country == shop.home_country:
        if paid_cents >= shop.free_shipping_from_cents:
            return 0
    elif weight_grams > 5_000:
        # Heavy parcels abroad go as freight: one flat price.
        return 3_500
    client = ParcelNowClient(account=shop.parcelnow_account)
    rate = client.get_rate(weight_grams / 1000, country)
    euros, cents = rate["amount"].split(".")
    parcelnow_cents = int(euros) * 100 + int(cents)
    swiftship_cents = SwiftShip().quote(
        {"grams": weight_grams, "to": country}
    )
    return min(parcelnow_cents, swiftship_cents)
