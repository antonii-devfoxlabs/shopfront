"""One order through the whole store: `python -m shopfront`."""

from datetime import date

from shopfront.cart import Cart
from shopfront.catalog import starter_catalog
from shopfront.orders import (
    OrderBuilder,
    format_money,
    next_order_id,
    place_order,
)
from shopfront.payments import pay
from shopfront.pricing import PriceCalculator
from shopfront.settings import GERMAN_SHOP
from shopfront.shipping import (
    BoxRouteQuote,
    ParcelNowQuote,
    ShippingQuote,
    SwiftShipQuote,
    shipping_cost,
)
from shopfront.vendor.analytics import Analytics
from shopfront.vendor.mailer import Mailer
from shopfront.vendor.parcelnow import ParcelNowClient
from shopfront.vendor.payment_gateway import PaymentGateway
from shopfront.vendor.swiftship import SwiftShip
from shopfront.vendor.tax_service import TaxService


def main() -> None:
    # The one place that picks the shop, and hands it to every part.
    shop = GERMAN_SHOP
    gateway = PaymentGateway(merchant=shop.merchant_id)
    providers: list[ShippingQuote] = [
        ParcelNowQuote(ParcelNowClient(account=shop.parcelnow_account)),
        SwiftShipQuote(SwiftShip()),
        BoxRouteQuote(),
    ]
    catalog = starter_catalog()
    cart = Cart()
    cart.add("MUG-01", 2)
    cart.add("TEA-02")

    calculator = PriceCalculator(catalog, TaxService(), shop)
    quote = calculator.quote(
        cart, "DE", today=date.today(), coupon="WELCOME10"
    )
    paid_cents = quote.subtotal_cents - quote.discount_cents
    shipping_cents = shipping_cost(
        cart, catalog, "DE", paid_cents, providers, shop
    )
    total_cents = paid_cents + quote.tax_cents + shipping_cents

    order_id = next_order_id()
    transaction_id = pay(
        "card", total_cents, {"card_token": "tok-4242"}, gateway
    )
    order = (
        OrderBuilder(order_id)
        .email("ada@example.com")
        .name("Ada")
        .lines(cart.lines)
        .subtotal(quote.subtotal_cents)
        .discount(quote.discount_cents)
        .tax(quote.tax_cents)
        .shipping(shipping_cents)
        .country("DE")
        .paid_by("card")
        .transaction(transaction_id)
        .build()
    )
    mailer = Mailer()
    place_order(order, catalog, mailer, Analytics(), shop)

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
