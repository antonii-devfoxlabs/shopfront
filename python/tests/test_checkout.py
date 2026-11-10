"""One order through the whole store, the way `python -m shopfront`
runs it."""

import asyncio
from datetime import date

from shopfront.cart import Cart
from shopfront.catalog import Catalog, starter_catalog
from shopfront.checkout import Checkout, buy_again
from shopfront.orders import OrderBuilder, next_order_id, packing_slip
from shopfront.payments import Gateway
from shopfront.pricing import PriceCalculator
from shopfront.providers import (
    boxroute_quote,
    parcelnow_quote,
    swiftship_quote,
)
from shopfront.settings import DUTCH_SHOP, GERMAN_SHOP, Settings
from shopfront.shipping import ShippingQuote, shipping_cost
from shopfront.vendor.analytics import Analytics
from shopfront.vendor.mailer import Mailer
from shopfront.vendor.parcelnow import ParcelNowClient
from shopfront.vendor.swiftship import SwiftShip
from shopfront.vendor.tax_service import TaxService


def providers_for(shop: Settings) -> list[ShippingQuote]:
    """Every shipping provider, with the shop's ParcelNow account."""
    return [
        parcelnow_quote(ParcelNowClient(account=shop.parcelnow_account)),
        swiftship_quote(SwiftShip()),
        boxroute_quote,
    ]


def checkout_for(
    shop: Settings, catalog: Catalog, gateway: Gateway, mailer: Mailer
) -> Checkout:
    """A checkout with the real parts, and the test's own to look into."""
    return Checkout(
        quote=PriceCalculator(catalog, TaxService(), shop).quote,
        shipping_cost=shipping_cost,
        providers=providers_for(shop),
        catalog=catalog,
        gateway=gateway,
        mailer=mailer,
        analytics=Analytics(),
        shop=shop,
    )


def test_a_whole_order(gateway):
    shop = GERMAN_SHOP
    catalog = starter_catalog()
    mailer = Mailer()
    cart = Cart()
    cart.add("MUG-01", 2)
    cart.add("TEA-02")

    order = checkout_for(shop, catalog, gateway, mailer).buy(
        cart,
        "DE",
        email="ada@example.com",
        name="Ada",
        paid_by="card",
        details={"card_token": "tok-4242"},
        today=date(2026, 6, 15),
        coupon="WELCOME10",
    )

    assert order.total_cents == 4_121
    assert catalog.find("MUG-01").stock == 38
    assert len(mailer.outbox) == 1


def test_ordering_again(gateway):
    shop = GERMAN_SHOP
    catalog = starter_catalog()
    previous = (
        OrderBuilder(next_order_id())
        .email("ada@example.com")
        .name("Ada")
        .lines({"MUG-01": 2, "TEA-02": 1})
        .subtotal(3_390)
        .discount(339)
        .tax(580)
        .shipping(490)
        .country("DE")
        .paid_by("card")
        .transaction("txn-0001")
        .build()
    )
    assert packing_slip(previous)[-1] == "1 x TEA-SAMPLE"
    mailer = Mailer()
    order = buy_again(
        previous,
        {"card_token": "tok-4242"},
        date(2026, 7, 15),
        PriceCalculator(catalog, TaxService(), shop),
        providers_for(shop),
        catalog,
        gateway,
        mailer,
        Analytics(),
        shop,
    )

    assert order.order_id != previous.order_id
    assert order.customer_name == "Ada"
    assert order.lines == previous.lines
    assert order.shipping_country == "DE"
    assert order.tax_cents == 644
    assert order.total_cents == 4_524
    assert catalog.find("MUG-01").stock == 38
    assert len(mailer.outbox) == 1


def test_two_shops_in_one_run():
    async def checkout(shop: Settings, country: str) -> int:
        await asyncio.sleep(0.01)  # The bank answers.
        cart = Cart()
        cart.add("MUG-01", 5)
        return shipping_cost(
            cart, starter_catalog(), country, 6_000, providers_for(shop), shop
        )

    async def both() -> list[int]:
        return list(
            await asyncio.gather(
                checkout(DUTCH_SHOP, "NL"), checkout(GERMAN_SHOP, "DE")
            )
        )

    assert asyncio.run(both()) == [0, 0]
