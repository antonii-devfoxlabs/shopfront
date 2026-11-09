"""One order through the whole store, the way `python -m shopfront`
runs it."""

from datetime import date

from shopfront.cart import Cart
from shopfront.catalog import starter_catalog
from shopfront.orders import (
    OrderBuilder,
    next_order_id,
    place_order,
    reorder,
)
from shopfront.payments import pay
from shopfront.pricing import PriceCalculator
from shopfront.shipping import shipping_cost
from shopfront.vendor.analytics import Analytics
from shopfront.vendor.mailer import Mailer
from shopfront.vendor.tax_service import TaxService


def test_a_whole_order():
    catalog = starter_catalog()
    cart = Cart()
    cart.add("MUG-01", 2)
    cart.add("TEA-02")

    calculator = PriceCalculator(catalog, TaxService())
    quote = calculator.quote(cart, "DE", "WELCOME10", date(2026, 6, 15))
    paid_cents = quote.subtotal_cents - quote.discount_cents
    shipping_cents = shipping_cost(cart, catalog, "DE", paid_cents)
    total_cents = paid_cents + quote.tax_cents + shipping_cents

    transaction_id = pay("card", total_cents, {"card_token": "tok-4242"})
    order = (
        OrderBuilder(next_order_id())
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
    place_order(order, catalog, mailer, Analytics())

    assert order.total_cents == 4_121
    assert catalog.find("MUG-01").stock == 38
    assert len(mailer.outbox) == 1


def test_ordering_again():
    catalog = starter_catalog()
    previous = (
        OrderBuilder("SF-00001")
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
    cart = Cart()
    for sku, quantity in previous.lines.items():
        cart.add(sku, quantity)
    country = previous.shipping_country

    calculator = PriceCalculator(catalog, TaxService())
    quote = calculator.quote(cart, country, None, date(2026, 7, 15))
    paid_cents = quote.subtotal_cents - quote.discount_cents
    shipping_cents = shipping_cost(cart, catalog, country, paid_cents)
    total_cents = paid_cents + quote.tax_cents + shipping_cents

    transaction_id = pay("card", total_cents, {"card_token": "tok-4242"})
    order = reorder(
        previous,
        next_order_id(),
        quote.subtotal_cents,
        quote.discount_cents,
        quote.tax_cents,
        shipping_cents,
        "card",
        transaction_id,
    )

    assert order.order_id != previous.order_id
    assert order.customer_name == "Ada"
    assert order.lines == previous.lines
    assert order.shipping_country == "DE"
    assert order.tax_cents == 644
    assert order.total_cents == 4_524
