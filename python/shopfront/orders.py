"""An order, and what happens once it is placed."""

from shopfront import settings
from shopfront.catalog import Catalog
from shopfront.vendor.analytics import Analytics
from shopfront.vendor.mailer import Mailer

_last_order_number = 0


def next_order_id() -> str:
    global _last_order_number
    _last_order_number += 1
    return f"SF-{_last_order_number:05d}"


class Order:
    def __init__(
        self,
        order_id: str,
        customer_email: str,
        lines: dict[str, int],
        subtotal_cents: int,
        discount_cents: int,
        tax_cents: int,
        shipping_cents: int,
        shipping_country: str,
        payment_method: str,
        transaction_id: str,
    ) -> None:
        self.order_id = order_id
        self.customer_email = customer_email
        self.lines = dict(lines)
        self.subtotal_cents = subtotal_cents
        self.discount_cents = discount_cents
        self.tax_cents = tax_cents
        self.shipping_cents = shipping_cents
        self.shipping_country = shipping_country
        self.payment_method = payment_method
        self.transaction_id = transaction_id
        self.status = "placed"

    @property
    def total_cents(self) -> int:
        return (
            self.subtotal_cents
            - self.discount_cents
            + self.tax_cents
            + self.shipping_cents
        )


def place_order(
    order: Order, catalog: Catalog, mailer: Mailer, analytics: Analytics
) -> None:
    catalog.take_all_from_stock(order.lines)
    mailer.send(
        sender=settings.STORE_EMAIL,
        to=order.customer_email,
        subject=f"{settings.STORE_NAME}: order {order.order_id}",
        body=(
            f"Thank you! We have your order {order.order_id}, "
            f"{format_money(order.total_cents)} in all."
        ),
    )
    analytics.track(
        "order_placed",
        {"order_id": order.order_id, "total_cents": order.total_cents},
    )


def format_money(cents: int) -> str:
    sign = "-" if cents < 0 else ""
    euros, rest = divmod(abs(cents), 100)
    return f"{sign}{euros}.{rest:02d} {settings.CURRENCY}"
