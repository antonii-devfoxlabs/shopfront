"""One order through the whole store, the way `python -m shopfront`
runs it."""

import asyncio
from datetime import date

import pytest

from shopfront.cart import Cart
from shopfront.catalog import Catalog, OutOfStockError, starter_catalog
from shopfront.checkout import Checkout, buy_again
from shopfront.listeners import email_shopper, text_warehouse, track_order
from shopfront.orders import (
    OrderBook,
    OrderBuilder,
    OrderEvents,
    next_order_id,
)
from shopfront.packing import packing_slip
from shopfront.payments import Gateway
from shopfront.pricing import PriceCalculator, TaxRates
from shopfront.providers import (
    boxroute_quote,
    parcelnow_quote,
    swiftship_quote,
)
from shopfront.settings import DUTCH_SHOP, GERMAN_SHOP, Settings
from shopfront.shipping import Shipping, ShippingQuote, offer_for
from shopfront.taxes import CachedRates, RetriedRates
from shopfront.vendor.analytics import Analytics
from shopfront.vendor.mailer import Mailer
from shopfront.vendor.parcelnow import ParcelNowClient
from shopfront.vendor.sms import Sms
from shopfront.vendor.swiftship import SwiftShip
from shopfront.vendor.tax_service import TaxService, TaxServiceTimeoutError


def providers_for(shop: Settings) -> list[ShippingQuote]:
    """Every shipping provider, with the shop's ParcelNow account."""
    return [
        parcelnow_quote(ParcelNowClient(account=shop.parcelnow_account)),
        swiftship_quote(SwiftShip()),
        boxroute_quote,
    ]


A_MONDAY = date(2026, 6, 15)


def shipping_for(shop: Settings) -> Shipping:
    """The shop's shipping, with the offer its settings name, on a clock
    that says Monday: the offer reads its own clock, so these tests never
    depend on the day they run."""
    return Shipping(
        offer=offer_for(shop, today=lambda: A_MONDAY),
        providers=providers_for(shop),
        shop=shop,
    )


def checkout_for(
    shop: Settings, catalog: Catalog, gateway: Gateway, mailer: Mailer
) -> Checkout:
    """A checkout with the real parts, and the test's own to look into."""
    events = OrderEvents()
    events.placed.subscribe(email_shopper(mailer, shop))
    events.placed.subscribe(track_order(Analytics()))
    events.placed.subscribe(text_warehouse(Sms(), shop))
    return Checkout(
        quote=PriceCalculator(catalog, TaxService(), shop).quote,
        shipping_cost=shipping_for(shop).cost,
        catalog=catalog,
        book=OrderBook(),
        gateway=gateway,
        events=events,
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


def test_an_order_out_of_stock_charges_nothing(gateway):
    shop = GERMAN_SHOP
    catalog = starter_catalog()
    mailer = Mailer()
    cart = Cart()
    cart.add("KTL-03", 9)

    with pytest.raises(OutOfStockError):
        checkout_for(shop, catalog, gateway, mailer).buy(
            cart,
            "DE",
            email="ada@example.com",
            name="Ada",
            paid_by="card",
            details={"card_token": "tok-4242"},
            today=date(2026, 6, 15),
        )

    assert gateway.charges == []
    assert mailer.outbox == []


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
        checkout_for(shop, catalog, gateway, mailer),
        previous,
        {"card_token": "tok-4242"},
        date(2026, 7, 15),
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
        return shipping_for(shop).cost(
            cart, starter_catalog(), country, 6_000
        )

    async def both() -> list[int]:
        return list(
            await asyncio.gather(
                checkout(DUTCH_SHOP, "NL"), checkout(GERMAN_SHOP, "DE")
            )
        )

    assert asyncio.run(both()) == [0, 0]


def checkout_with(
    taxes: TaxRates, gateway: Gateway, events: OrderEvents
) -> Checkout:
    """A checkout of the German shop, with the test's own tax rates and
    news."""
    shop = GERMAN_SHOP
    catalog = starter_catalog()
    return Checkout(
        quote=PriceCalculator(catalog, taxes, shop).quote,
        shipping_cost=shipping_for(shop).cost,
        catalog=catalog,
        book=OrderBook(),
        gateway=gateway,
        events=events,
    )


def buy_a_mug(checkout: Checkout) -> None:
    cart = Cart()
    cart.add("MUG-01")
    checkout.buy(
        cart,
        "DE",
        email="ada@example.com",
        name="Ada",
        paid_by="card",
        details={"card_token": "tok-4242"},
        today=A_MONDAY,
    )


def test_a_slow_tax_service_is_asked_as_often_as_its_one_retry_says(
    gateway,
):
    # Only the wrapper round the tax service asks again: a part above it
    # that asked again too would multiply its tries.
    tax_service = TaxService(timeout_seconds=0.01)
    taxes = CachedRates(RetriedRates(tax_service, tries=2))
    with pytest.raises(TaxServiceTimeoutError):
        buy_a_mug(checkout_with(taxes, gateway, OrderEvents()))
    assert tax_service.lookups == 2
    assert gateway.charges == []


def test_a_sale_that_fails_after_the_charge_charges_once(gateway):
    def mail_provider_hangs_up(order):
        raise ConnectionError("the mail provider hung up")

    events = OrderEvents()
    events.placed.subscribe(mail_provider_hangs_up)
    with pytest.raises(ConnectionError):
        buy_a_mug(checkout_with(TaxService(), gateway, events))
    assert len(gateway.charges) == 1
