"""Selling a cart: what the store's pages call to take an order."""

from datetime import date

from shopfront.cart import Cart
from shopfront.catalog import Catalog
from shopfront.orders import Order, next_order_id, place_order, reorder
from shopfront.payments import Gateway, pay
from shopfront.pricing import PriceCalculator
from shopfront.settings import Settings
from shopfront.shipping import ShippingQuote, shipping_cost
from shopfront.vendor.analytics import Analytics
from shopfront.vendor.mailer import Mailer


def buy_again(
    previous: Order,
    details: dict,
    today: date,
    calculator: PriceCalculator,
    providers: list[ShippingQuote],
    catalog: Catalog,
    gateway: Gateway,
    mailer: Mailer,
    analytics: Analytics,
    shop: Settings,
) -> Order:
    """The Buy again button: the same products, to the same address."""
    builder = reorder(previous, next_order_id())
    cart = Cart()
    for sku, quantity in previous.lines.items():
        cart.add(sku, quantity)
    country = previous.shipping_country

    quote = calculator.quote(cart, country, today=today)
    builder.subtotal(quote.subtotal_cents)
    builder.discount(quote.discount_cents)
    builder.tax(quote.tax_cents)

    paid_cents = quote.subtotal_cents - quote.discount_cents
    shipping_cents = shipping_cost(
        cart, catalog, country, paid_cents, providers, shop
    )
    builder.shipping(shipping_cents)

    total_cents = paid_cents + quote.tax_cents + shipping_cents
    transaction_id = pay(
        previous.payment_method, total_cents, details, gateway
    )
    builder.paid_by(previous.payment_method).transaction(transaction_id)
    order = builder.build()
    place_order(order, catalog, mailer, analytics, shop)
    return order
