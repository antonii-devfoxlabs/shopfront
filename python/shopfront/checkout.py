"""Selling a cart: what the store's pages call to take an order."""

from collections.abc import Callable
from dataclasses import dataclass
from datetime import date

from shopfront.cart import Cart
from shopfront.catalog import Catalog
from shopfront.orders import (
    Order,
    OrderBook,
    OrderBuilder,
    format_money,
    next_order_id,
    place_order,
)
from shopfront.payments import Gateway, pay
from shopfront.pricing import PriceQuote
from shopfront.returns import Return
from shopfront.settings import Settings
from shopfront.shipping import ShippingQuote
from shopfront.vendor.analytics import Analytics
from shopfront.vendor.mailer import Mailer


@dataclass(frozen=True, kw_only=True)
class Checkout:
    """One call that sells a cart: every step of an order, in order.

    main hands it the store's parts once; a page calls buy().
    """

    quote: Callable[..., PriceQuote]
    shipping_cost: Callable[..., int]
    providers: list[ShippingQuote]
    catalog: Catalog
    gateway: Gateway
    mailer: Mailer
    analytics: Analytics
    shop: Settings

    def buy(
        self,
        cart: Cart,
        country: str,
        *,
        email: str,
        name: str,
        paid_by: str,
        details: dict,
        today: date,
        coupon: str | None = None,
    ) -> Order:
        """Check the stock, price the cart, ship it, take the money, then
        place the order."""
        # Never charge a card for an order the store cannot send.
        self.catalog.check_stock(cart.lines)
        quote = self.quote(cart, country, today=today, coupon=coupon)
        paid_cents = quote.subtotal_cents - quote.discount_cents
        shipping_cents = self.shipping_cost(
            cart, self.catalog, country, paid_cents, self.providers, self.shop
        )
        total_cents = paid_cents + quote.tax_cents + shipping_cents

        transaction_id = pay(paid_by, total_cents, details, self.gateway)
        order = (
            OrderBuilder(next_order_id())
            .email(email)
            .name(name)
            .lines(cart.lines)
            .subtotal(quote.subtotal_cents)
            .discount(quote.discount_cents)
            .tax(quote.tax_cents)
            .shipping(shipping_cents)
            .country(country)
            .paid_by(paid_by)
            .transaction(transaction_id)
            .build()
        )
        place_order(
            order, self.catalog, self.mailer, self.analytics, self.shop
        )
        return order

    def refund(self, order_id: str, details: dict) -> str:
        """Give an order's money back, and tell the shopper."""
        order = OrderBook.instance().find(order_id)
        refund_id = Return(order, details, self.gateway).process()
        self.mailer.send(
            sender=self.shop.store_email,
            to=order.customer_email,
            subject=f"{self.shop.store_name}: refund for {order.order_id}",
            body=(
                f"Hi {order.customer_name}, we have refunded "
                f"{format_money(order.total_cents, self.shop)}."
            ),
        )
        return refund_id

    def sales_report(self) -> str:
        """The owner's Monday line: the orders kept, and what they took."""
        kept = [
            order
            for order in OrderBook.instance().orders()
            if order.status == "placed"
        ]
        takings = sum(order.total_cents for order in kept)
        return (
            f"Orders: {len(kept)}, "
            f"takings: {format_money(takings, self.shop)}"
        )


def buy_again(
    checkout: Checkout, previous: Order, details: dict, today: date
) -> Order:
    """The Buy again button: the same products, to the same address."""
    cart = Cart()
    for sku, quantity in previous.lines.items():
        cart.add(sku, quantity)
    return checkout.buy(
        cart,
        previous.shipping_country,
        email=previous.customer_email,
        name=previous.customer_name,
        paid_by=previous.payment_method,
        details=details,
        today=today,
    )
