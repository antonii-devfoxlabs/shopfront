"""What it costs to ship a cart."""

from shopfront import settings
from shopfront.cart import Cart
from shopfront.catalog import Catalog
from shopfront.vendor.parcelnow import ParcelNowClient


def cart_weight_grams(cart: Cart, catalog: Catalog) -> int:
    return sum(
        catalog.find(sku).weight_grams * quantity
        for sku, quantity in cart.lines.items()
    )


def shipping_cost(
    cart: Cart, catalog: Catalog, country: str, paid_cents: int
) -> int:
    weight_grams = cart_weight_grams(cart, catalog)
    if country == settings.HOME_COUNTRY:
        if paid_cents >= settings.FREE_SHIPPING_FROM_CENTS:
            return 0
    elif weight_grams > 5_000:
        # Heavy parcels abroad go as freight: one flat price.
        return 3_500
    client = ParcelNowClient(account=settings.PARCELNOW_ACCOUNT)
    rate = client.get_rate(weight_grams / 1000, country)
    euros, cents = rate["amount"].split(".")
    return int(euros) * 100 + int(cents)
