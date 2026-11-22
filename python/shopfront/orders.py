"""An order, and what happens once it is placed."""

from collections.abc import Callable, Iterator, Mapping
from dataclasses import dataclass
from types import MappingProxyType

from shopfront.catalog import Catalog
from shopfront.parcels import Parcel

_last_order_number = 0


def next_order_id() -> str:
    global _last_order_number
    _last_order_number += 1
    return f"SF-{_last_order_number:05d}"


class DispatchRefusedError(Exception):
    pass


class CancelRefusedError(Exception):
    pass


class ReturnRefusedError(Exception):
    pass


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
        self._status = "placed"
        # The parcel the warehouse handed a courier: None until dispatched.
        self._parcel: Parcel | None = None

    def __setattr__(self, name: str, value: object) -> None:
        # Each part is set once, in __init__; only the order's own moves
        # change the status, and the parcel once the order leaves.
        if name not in ("_status", "_parcel") and hasattr(self, name):
            raise AttributeError(f"an order's {name} cannot change")
        super().__setattr__(name, value)

    @property
    def status(self) -> str:
        return self._status

    @property
    def parcel(self) -> Parcel | None:
        return self._parcel

    @property
    def total_cents(self) -> int:
        return (
            self.subtotal_cents
            - self.discount_cents
            + self.tax_cents
            + self.shipping_cents
        )

    def tracking_link(self) -> str | None:
        """Where the shopper can follow the order's parcel: None until the
        order is dispatched."""
        if self.parcel is None:
            return None
        return self.parcel.tracking_link()

    # The order's moves: the only code that changes its status. Each
    # refuses a move its status's row in STATUSES does not allow.

    def mark_dispatched(self, parcel: Parcel) -> None:
        """Its parcel has left the warehouse with a courier."""
        if not status_of(self).dispatchable:
            raise DispatchRefusedError(f"{self.order_id} is {self.status}")
        self._parcel = parcel
        self._status = "dispatched"

    def mark_cancelled(self) -> None:
        """The shopper no longer wants it, and it has not left yet."""
        if not status_of(self).cancellable:
            raise CancelRefusedError(f"{self.order_id} is {self.status}")
        self._status = "cancelled"

    def check_returnable(self) -> None:
        """Refuse a return before any money goes back for it."""
        if not status_of(self).returnable:
            raise ReturnRefusedError(f"{self.order_id} is {self.status}")

    def mark_returned(self) -> None:
        """It came back, and its money went back."""
        self.check_returnable()
        self._status = "returned"

    def mark_exchanged(self) -> None:
        """It came back for the same product again."""
        self.check_returnable()
        self._status = "exchanged"


class UnknownStatusError(Exception):
    pass


@dataclass(frozen=True, kw_only=True)
class Status:
    """What the rest of the store needs to know of an order's status."""

    # Counted in the takings and in the accountant's sales files.
    sale: bool
    # Can still be sent back for its money.
    returnable: bool
    # Can still leave the warehouse.
    dispatchable: bool
    # Can still be cancelled: it has never left the warehouse.
    cancellable: bool


# Every status an order can have, and what it means. A new status is a
# new row: the code that asks what a status means reads it here.
STATUSES: Mapping[str, Status] = MappingProxyType(
    {
        "placed": Status(
            sale=True, returnable=True, dispatchable=True, cancellable=True
        ),
        "dispatched": Status(
            sale=True, returnable=True, dispatchable=False, cancellable=False
        ),
        "cancelled": Status(
            sale=False,
            returnable=False,
            dispatchable=False,
            cancellable=False,
        ),
        "returned": Status(
            sale=False,
            returnable=False,
            dispatchable=False,
            cancellable=False,
        ),
        # Sent back for the same product again: the sale stands, and the
        # new one has still to leave the warehouse.
        "exchanged": Status(
            sale=True, returnable=True, dispatchable=True, cancellable=False
        ),
    }
)


def status_of(order: Order) -> Status:
    """What the order's status means: its row in STATUSES."""
    status = STATUSES.get(order.status)
    if status is None:
        raise UnknownStatusError(order.status)
    return status


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


class UnknownOrderError(Exception):
    pass


class OrderBook:
    """Every order the store has placed, found by its number.

    main makes the store's one book and hands it to every part that
    keeps or finds orders.
    """

    def __init__(self) -> None:
        self._orders: list[Order] = []
        self._by_id: dict[str, Order] = {}

    def add(self, order: Order) -> None:
        self._orders.append(order)
        self._by_id[order.order_id] = order

    def find(self, order_id: str) -> Order:
        order = self._by_id.get(order_id)
        if order is None:
            raise UnknownOrderError(order_id)
        return order

    def orders(self) -> list[Order]:
        """Every order in the book, in the order they were placed."""
        return list(self._orders)

    def cursor(self) -> Iterator[Order]:
        """A new walk over every order, from the newest."""
        place = len(self._orders)
        while place > 0:
            place -= 1
            yield self._orders[place]

    def __iter__(self) -> Iterator[Order]:
        """What a for loop asks for: a new cursor, from the newest."""
        return self.cursor()


def reset() -> None:
    """For tests only: order numbers from SF-00001 again."""
    global _last_order_number
    _last_order_number = 0


# Every part that must hear of a placed order fills this slot: a
# function that is told the order and answers nothing.
OrderListener = Callable[[Order], None]

# What subscribing answers: call it to take that listener off again.
Cancel = Callable[[], None]


class Listeners:
    """Who hears of one kind of news about an order: a plain list of
    callbacks, kept with its rules. Listeners join and leave it while the
    shop runs."""

    def __init__(self) -> None:
        self._listeners: list[OrderListener] = []

    def subscribe(self, listener: OrderListener) -> Cancel:
        """Tell this listener of every such news from now on, once each.
        Answers the way to cancel: whoever subscribes keeps it."""
        if listener not in self._listeners:
            self._listeners.append(listener)

        def cancel() -> None:
            self.unsubscribe(listener)

        return cancel

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

    def __len__(self) -> int:
        """How many listeners are on the list now."""
        return len(self._listeners)


class OrderEvents:
    """What happens to an order, one list of listeners per kind of news.
    Each kind is named in code: a misspelt one is an error, for mypy and
    when the line runs."""

    def __init__(self) -> None:
        self.placed = Listeners()
        self.refunded = Listeners()
        self.dispatched = Listeners()


def place_order(
    order: Order, catalog: Catalog, book: OrderBook, events: OrderEvents
) -> None:
    """Take the stock and keep the order in the book, then announce it."""
    catalog.take_all_from_stock(order.lines)
    book.add(order)
    # The order is placed: now tell everyone subscribed at this moment.
    events.placed.notify(order)


def dispatch(order: Order, parcel: Parcel, events: OrderEvents) -> None:
    """Mark an order dispatched: its parcel has left the warehouse with a
    courier. Then announce it."""
    order.mark_dispatched(parcel)
    events.dispatched.notify(order)
