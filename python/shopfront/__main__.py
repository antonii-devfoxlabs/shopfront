"""One order through the whole store: `python -m shopfront`."""

from datetime import date

from shopfront.cart import Cart
from shopfront.catalog import starter_catalog
from shopfront.orders import Order, format_money, next_order_id, place_order
from shopfront.payments import pay
from shopfront.pricing import PriceCalculator
from shopfront.shipping import shipping_cost
from shopfront.vendor.analytics import Analytics
from shopfront.vendor.mailer import Mailer
from shopfront.vendor.tax_service import TaxService


def main() -> None:
    catalog = starter_catalog()
    cart = Cart()
    cart.add("MUG-01", 2)
    cart.add("TEA-02")

    calculator = PriceCalculator(catalog, TaxService())
    quote = calculator.quote(cart, "DE", "WELCOME10", date.today())
    paid_cents = quote.subtotal_cents - quote.discount_cents
    shipping_cents = shipping_cost(cart, catalog, "DE", paid_cents)
    total_cents = paid_cents + quote.tax_cents + shipping_cents

    order_id = next_order_id()
    transaction_id = pay("card", total_cents, {"card_token": "tok-4242"})
    order = Order(
        order_id,
        "ada@example.com",
        "Ada",
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

    print(f"Order {order.order_id} placed")
    print(f"  subtotal  {format_money(order.subtotal_cents)}")
    if order.discount_cents:
        print(f"  discount -{format_money(order.discount_cents)}")
    print(f"  tax       {format_money(order.tax_cents)}")
    print(f"  shipping  {format_money(order.shipping_cents)}")
    print(f"  total     {format_money(order.total_cents)}")
    print(f"Email sent to {mailer.outbox[0]['to']}")


if __name__ == "__main__":
    main()
