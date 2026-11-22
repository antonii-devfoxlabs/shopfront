"""Orders sent back, and the money that goes back with them."""

from dataclasses import dataclass
from typing import Protocol

from shopfront.money import format_money
from shopfront.orders import Order, OrderBook, OrderEvents, status_of
from shopfront.payments import Gateway, refund
from shopfront.settings import Settings
from shopfront.vendor.mailer import Mailer


class Return:
    """An order sent back. Its money goes back to the way to pay named
    to: the way the order was paid, unless the caller names another."""

    def __init__(
        self,
        order: Order,
        details: dict,
        gateway: Gateway,
        to: str | None = None,
    ) -> None:
        self.order = order
        self.details = details
        self.gateway = gateway
        self.to = order.payment_method if to is None else to

    def process(self) -> str:
        """Give the money back once, and mark the order returned."""
        self.order.check_returnable()
        refund_id = refund(
            self.to, self.order.total_cents, self.details, self.gateway
        )
        self.order.mark_returned()
        return refund_id


class Exchange:
    """A product sent back and the same one sent again: the sale stands,
    and no money moves, so an exchange is not a Return."""

    def __init__(self, order: Order) -> None:
        self.order = order

    def process(self) -> None:
        """Take the product back, and mark the order exchanged."""
        self.order.mark_exchanged()


class GoodwillRefusedError(Exception):
    pass


class GoodwillCheck(Protocol):
    """A reason to refuse a goodwill credit: check raises, or passes."""

    def check(self, order: Order) -> None: ...


class HasLeft:
    def check(self, order: Order) -> None:
        if order.parcel is None:
            raise GoodwillRefusedError(f"{order.order_id} is {order.status}")


class StillASale:
    def check(self, order: Order) -> None:
        if not status_of(order).sale:
            raise GoodwillRefusedError(f"{order.order_id} is {order.status}")


# The part of an order's total the support team gives back, in percent,
# by what went wrong with the parcel.
GOODWILL_PERCENT = {"late": 10, "damaged": 50, "lost": 100}

# The checks every goodwill credit must pass, in this order.
GOODWILL_CHECKS: list[GoodwillCheck] = [HasLeft(), StillASale()]


def goodwill_cents(order: Order, reason: str) -> int:
    """What the store gives back for a parcel that went wrong: only for
    an order that has left, and is still a sale."""
    for goodwill_check in GOODWILL_CHECKS:
        goodwill_check.check(order)
    percent = GOODWILL_PERCENT.get(reason)
    if percent is None:
        raise GoodwillRefusedError(f"no goodwill for {reason}")
    return order.total_cents * percent // 100


@dataclass(frozen=True, kw_only=True)
class Refunds:
    """The calls that give an order's money back, and tell the shopper.

    The return page builds it once with its parts and calls refund(); the
    support page calls make_good().
    """

    gateway: Gateway
    mailer: Mailer
    shop: Settings
    # The store's one order book, where the order is found.
    book: OrderBook
    # Who hears of a refund: main subscribes them.
    events: OrderEvents

    def refund(
        self, order_id: str, details: dict, to: str | None = None
    ) -> str:
        """Give an order's money back, tell the shopper, then announce it.
        to: the way to pay the money goes back to, as Return takes it."""
        order = self.book.find(order_id)
        refund_id = Return(order, details, self.gateway, to).process()
        self.mailer.send(
            sender=self.shop.store_email,
            to=order.customer_email,
            subject=f"{self.shop.store_name}: refund for {order.order_id}",
            body=(
                f"Hi {order.customer_name}, we have refunded "
                f"{format_money(order.total_cents, self.shop)}."
            ),
        )
        self.events.refunded.notify(order)
        return refund_id

    def make_good(self, order_id: str, reason: str, details: dict) -> str:
        """Give part of an order's money back for a parcel that went
        wrong, and tell the shopper. The order stays as it is, and nothing
        is announced: nothing comes back to the warehouse."""
        order = self.book.find(order_id)
        cents = goodwill_cents(order, reason)
        refund_id = refund(order.payment_method, cents, details, self.gateway)
        self.mailer.send(
            sender=self.shop.store_email,
            to=order.customer_email,
            subject=f"{self.shop.store_name}: refund for {order.order_id}",
            body=(
                f"Hi {order.customer_name}, sorry about your parcel: we "
                f"have refunded {format_money(cents, self.shop)}."
            ),
        )
        return refund_id
