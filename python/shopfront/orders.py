"""An order, and what happens once it is placed."""

from collections.abc import Callable, Iterable, Mapping
from types import MappingProxyType
from typing import ClassVar

from shopfront.catalog import Catalog
from shopfront.settings import Settings

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
    """Every order the store has placed, found by its number.

    The store has one: get it with OrderBook.instance().
    """

    _instance: ClassVar[OrderBook | None] = None

    def __init__(self) -> None:
        if OrderBook._instance is not None:
            raise RuntimeError("the store has one order book: use instance()")
        self._orders: dict[str, Order] = {}
        OrderBook._instance = self

    @classmethod
    def instance(cls) -> OrderBook:
        """The store's order book, created the first time it is asked for."""
        if cls._instance is None:
            return cls()
        return cls._instance

    @classmethod
    def reset(cls) -> None:
        """For tests only: forget the book; the next ask makes a new one."""
        OrderBook._instance = None

    def add(self, order: Order) -> None:
        self._orders[order.order_id] = order

    def find(self, order_id: str) -> Order:
        order = self._orders.get(order_id)
        if order is None:
            raise UnknownOrderError(order_id)
        return order

    def orders(self) -> list[Order]:
        """Every order in the book, in the order they were placed."""
        return list(self._orders.values())


def reset() -> None:
    """For tests only: no orders, and numbers from SF-00001 again."""
    global _last_order_number
    _last_order_number = 0
    OrderBook.reset()


# Every part that must hear of a placed order fills this slot: a
# function that is told the order and answers nothing.
OrderListener = Callable[[Order], None]


class Listeners:
    """Who hears of one kind of news about an order: a plain list of
    callbacks, kept with its rules. Listeners join and leave it while the
    shop runs."""

    def __init__(self) -> None:
        self._listeners: list[OrderListener] = []

    def subscribe(self, listener: OrderListener) -> None:
        """Tell this listener of every such news from now on, once each."""
        if listener not in self._listeners:
            self._listeners.append(listener)

    def unsubscribe(self, listener: OrderListener) -> None:
        """Tell this listener nothing more; one not on the list is fine."""
        if listener in self._listeners:
            self._listeners.remove(listener)

    def notify(self, order: Order) -> None:
        """Tell every listener of the order, in the order they joined."""
        # A copy: a listener that joins or leaves while they are told
        # changes the list for the next order, not for this one.
        for listener in list(self._listeners):
            listener(order)


class OrderEvents:
    """Who hears of what happens to an order, by the news's name: "placed"
    or "refunded". Listeners join and leave while the shop runs."""

    def __init__(self) -> None:
        self._listeners: dict[str, list[OrderListener]] = {}

    def subscribe(self, name: str, listener: OrderListener) -> None:
        """Tell this listener of every such news from now on, once each."""
        listeners = self._listeners.setdefault(name, [])
        if listener not in listeners:
            listeners.append(listener)

    def unsubscribe(self, name: str, listener: OrderListener) -> None:
        """Tell this listener nothing more; one not on the list is fine."""
        listeners = self._listeners.get(name, [])
        if listener in listeners:
            listeners.remove(listener)

    def notify(self, name: str, order: Order) -> None:
        """Tell every listener of this news, in the order they joined."""
        # A copy: a listener that joins or leaves while they are told
        # changes the list for the next order, not for this one.
        for listener in list(self._listeners.get(name, [])):
            listener(order)


def place_order(order: Order, catalog: Catalog, events: OrderEvents) -> None:
    """Take the stock and keep the order, then announce it."""
    catalog.take_all_from_stock(order.lines)
    OrderBook.instance().add(order)
    # The order is placed: now tell everyone subscribed at this moment.
    events.notify("placed", order)


def sales_report(orders: Iterable[Order], shop: Settings) -> str:
    """The owner's Monday line: the orders kept, and what they took."""
    kept = [order for order in orders if order.status == "placed"]
    takings = sum(order.total_cents for order in kept)
    return f"Orders: {len(kept)}, takings: {format_money(takings, shop)}"


def format_money(cents: int, shop: Settings) -> str:
    sign = "-" if cents < 0 else ""
    euros, rest = divmod(abs(cents), 100)
    return f"{sign}{euros}.{rest:02d} {shop.currency}"
