"""One order through the whole store, the way `python -m shopfront`
runs it."""

from datetime import date

from shopfront.cart import Cart
from shopfront.catalog import starter_catalog
from shopfront.orders import Order, next_order_id, place_order
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
    order = Order(
        next_order_id(),
        "ada@example.com",
        cart.lines,
        quote.subtotal_cents,
        quote.discount_cents,
        quote.tax_cents,
        shipping_cents,
        "DE",
        "card",
        transaction_id,
    )
    mailer = Mailer()
    place_order(order, catalog, mailer, Analytics())

    assert order.total_cents == 4_121
    assert catalog.find("MUG-01").stock == 38
    assert len(mailer.outbox) == 1
