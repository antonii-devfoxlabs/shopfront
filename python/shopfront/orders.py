"""An order, and what happens once it is placed."""

from collections.abc import Mapping
from types import MappingProxyType

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
        customer_name: str,
        lines: Mapping[str, int],
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
        self.customer_name = customer_name
        self.lines = MappingProxyType(dict(lines))
        self.subtotal_cents = subtotal_cents
        self.discount_cents = discount_cents
        self.tax_cents = tax_cents
        self.shipping_cents = shipping_cents
        self.shipping_country = shipping_country
        self.payment_method = payment_method
        self.transaction_id = transaction_id
        self.status = "placed"

    def __setattr__(self, name: str, value: object) -> None:
        # Each part is set once, in __init__; only the status changes.
        if name != "status" and hasattr(self, name):
            raise AttributeError(f"an order's {name} cannot change")
        super().__setattr__(name, value)

    @property
    def total_cents(self) -> int:
        return (
            self.subtotal_cents
            - self.discount_cents
            + self.tax_cents
            + self.shipping_cents
        )


class IncompleteOrderError(Exception):
    pass


class OrderBuilder:
    """Takes an order's parts one at a time, by name, and builds it."""

    def __init__(self, order_id: str) -> None:
        self._order_id = order_id
        self._email: str | None = None
        self._name: str | None = None
        self._lines: Mapping[str, int] | None = None
        self._subtotal_cents: int | None = None
        self._discount_cents = 0
        self._tax_cents: int | None = None
        self._shipping_cents: int | None = None
        self._country: str | None = None
        self._paid_by: str | None = None
        self._transaction_id: str | None = None

    def email(self, address: str) -> OrderBuilder:
        self._email = address
        return self

    def name(self, name: str) -> OrderBuilder:
        self._name = name
        return self

    def lines(self, lines: Mapping[str, int]) -> OrderBuilder:
        self._lines = lines
        return self

    def subtotal(self, cents: int) -> OrderBuilder:
        self._subtotal_cents = cents
        return self

    def discount(self, cents: int) -> OrderBuilder:
        self._discount_cents = cents
        return self

    def tax(self, cents: int) -> OrderBuilder:
        self._tax_cents = cents
        return self

    def shipping(self, cents: int) -> OrderBuilder:
        self._shipping_cents = cents
        return self

    def country(self, code: str) -> OrderBuilder:
        self._country = code
        return self

    def paid_by(self, method: str) -> OrderBuilder:
        self._paid_by = method
        return self

    def transaction(self, transaction_id: str) -> OrderBuilder:
        self._transaction_id = transaction_id
        return self

    def build(self) -> Order:
        return Order(
            self._order_id,
            given(self._email, "email"),
            given(self._name, "name"),
            given(self._lines, "lines"),
            given(self._subtotal_cents, "subtotal"),
            self._discount_cents,
            given(self._tax_cents, "tax"),
            given(self._shipping_cents, "shipping"),
            given(self._country, "country"),
            given(self._paid_by, "paid_by"),
            given(self._transaction_id, "transaction"),
        )


def given[T](value: T | None, part: str) -> T:
    if value is None:
        raise IncompleteOrderError(part)
    return value


def reorder(previous: Order, order_id: str) -> OrderBuilder:
    """A new order with the parts that stay: who, what and where."""
    return (
        OrderBuilder(order_id)
        .email(previous.customer_email)
        .name(previous.customer_name)
        .lines(previous.lines)
        .country(previous.shipping_country)
    )


SAMPLE = "TEA-SAMPLE"
SAMPLE_FROM_CENTS = 4_000


def packing_slip(order: Order) -> list[str]:
    """What goes into the parcel, one line per product."""
    slip = [f"{quantity} x {sku}" for sku, quantity in order.lines.items()]
    if order.total_cents >= SAMPLE_FROM_CENTS:
        slip.append(f"1 x {SAMPLE}")
    return slip


class UnknownOrderError(Exception):
    pass


class OrderBook:
    """Every order the store has placed, found by its number."""

    def __init__(self) -> None:
        self._orders: dict[str, Order] = {}

    def add(self, order: Order) -> None:
        self._orders[order.order_id] = order

    def find(self, order_id: str) -> Order:
        order = self._orders.get(order_id)
        if order is None:
            raise UnknownOrderError(order_id)
        return order


# The one order book: every part that records or finds orders uses it.
book = OrderBook()


def place_order(
    order: Order, catalog: Catalog, mailer: Mailer, analytics: Analytics
) -> None:
    catalog.take_all_from_stock(order.lines)
    book.add(order)
    mailer.send(
        sender=settings.current.store_email,
        to=order.customer_email,
        subject=f"{settings.current.store_name}: order {order.order_id}",
        body=(
            f"Hi {order.customer_name}, thank you! "
            f"We have your order {order.order_id}, "
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
    return f"{sign}{euros}.{rest:02d} {settings.current.currency}"
