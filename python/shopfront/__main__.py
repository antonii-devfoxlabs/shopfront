"""One order through the whole store: `python -m shopfront`."""

import sys
from datetime import date
from pathlib import Path

from shopfront.cart import Cart
from shopfront.catalog_file import CatalogFileError, load_catalog
from shopfront.checkout import Checkout
from shopfront.gateways import TimedGateway
from shopfront.orders import format_money
from shopfront.pricing import PriceCalculator
from shopfront.providers import (
    boxroute_quote,
    parcelnow_quote,
    swiftship_quote,
)
from shopfront.settings import GERMAN_SHOP
from shopfront.shipping import ShippingQuote, shipping_cost
from shopfront.taxes import CachedRates, TimedRates
from shopfront.timing import timed
from shopfront.vendor.analytics import Analytics
from shopfront.vendor.mailer import Mailer
from shopfront.vendor.parcelnow import ParcelNowClient
from shopfront.vendor.payment_gateway import PaymentGateway
from shopfront.vendor.swiftship import SwiftShip
from shopfront.vendor.tax_service import TaxService


def main() -> None:
    # The one place that picks the shop, and hands it to every part.
    shop = GERMAN_SHOP
    # Every call to the payment gateway is timed and logged.
    gateway = TimedGateway(PaymentGateway(merchant=shop.merchant_id), print)
    # Every shipping quote is timed and logged, and so is the whole cost.
    parcelnow = ParcelNowClient(account=shop.parcelnow_account)
    providers: list[ShippingQuote] = [
        timed("parcelnow quote", parcelnow_quote(parcelnow), print),
        timed("swiftship quote", swiftship_quote(SwiftShip()), print),
        timed("boxroute quote", boxroute_quote, print),
    ]
    # The owner edits catalog.json; the shop reads it when it starts,
    # and will not start on a file it cannot read.
    try:
        catalog = load_catalog(Path("catalog.json"))
    except CatalogFileError as error:
        sys.exit(f"Shopfront cannot start: {error}")
    cart = Cart()
    cart.add("MUG-01", 2)
    cart.add("TEA-02")

    # The cache is outside the timer, so the log shows each real lookup
    # of the tax service, and how long the service took.
    taxes = CachedRates(TimedRates(TaxService(), print))
    calculator = PriceCalculator(catalog, taxes, shop)
    mailer = Mailer()
    # Every step of an order, in order, behind one call. main still
    # decides what is timed, and hands the checkout the timed parts.
    checkout = Checkout(
        # The timer is outside the calculator, so every quote is timed:
        # what a shopper waits for a price, cached rate or not.
        quote=timed("price quote", calculator.quote, print),
        shipping_cost=timed("shipping cost", shipping_cost, print),
        providers=providers,
        catalog=catalog,
        gateway=gateway,
        mailer=mailer,
        analytics=Analytics(),
        shop=shop,
    )
    order = checkout.buy(
        cart,
        "DE",
        email="ada@example.com",
        name="Ada",
        paid_by="card",
        details={"card_token": "tok-4242"},
        today=date.today(),
        coupon="WELCOME10",
    )

    print(f"Order {order.order_id} placed")
    print(f"  subtotal  {format_money(order.subtotal_cents, shop)}")
    if order.discount_cents:
        print(f"  discount -{format_money(order.discount_cents, shop)}")
    print(f"  tax       {format_money(order.tax_cents, shop)}")
    print(f"  shipping  {format_money(order.shipping_cents, shop)}")
    print(f"  total     {format_money(order.total_cents, shop)}")
    print(f"Email sent to {mailer.outbox[0]['to']}")


if __name__ == "__main__":
    main()
