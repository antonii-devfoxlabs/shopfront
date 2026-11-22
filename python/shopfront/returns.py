"""Orders sent back, and the money that goes back with them."""

from dataclasses import dataclass

from shopfront.money import format_money
from shopfront.orders import Order, OrderBook, OrderEvents
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
        cents: int | None = None,
    ) -> None:
        self.order = order
        self.details = details
        self.gateway = gateway
        self.to = order.payment_method if to is None else to
        # A goodwill credit gives back only part of the money, and the
        # order is not sent back.
        self.cents = cents

    def process(self) -> str:
        """Give the money back once, and mark the order returned."""
        if self.cents is None:
            self.order.check_returnable()
            cents = self.order.total_cents
        else:
            cents = self.cents
        refund_id = refund(self.to, cents, self.details, self.gateway)
        if self.cents is None:
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


@dataclass(frozen=True, kw_only=True)
class Refunds:
    """One call that gives an order's money back, and tells the shopper.

    The return page builds it once with its parts and calls refund().
    """

    gateway: Gateway
    mailer: Mailer
    shop: Settings
    # The store's one order book, where the order is found.
    book: OrderBook
    # Who hears of a refund: main subscribes them.
    events: OrderEvents

    def refund(
        self,
        order_id: str,
        details: dict,
        to: str | None = None,
        reason: str | None = None,
    ) -> str:
        """Give an order's money back, tell the shopper, then announce it.
        to: the way to pay the money goes back to, as Return takes it.
        reason: what went wrong with the parcel, for a goodwill credit."""
        order = self.book.find(order_id)
        cents = None
        if reason is not None:
            # Here, not at the top: support imports this module.
            from shopfront.support import goodwill_cents

            cents = goodwill_cents(order, reason)
        refund_id = Return(order, details, self.gateway, to, cents).process()
        if cents is None:
            body = (
                f"Hi {order.customer_name}, we have refunded "
                f"{format_money(order.total_cents, self.shop)}."
            )
        else:
            body = (
                f"Hi {order.customer_name}, sorry about your parcel: we "
                f"have refunded {format_money(cents, self.shop)}."
            )
        self.mailer.send(
            sender=self.shop.store_email,
            to=order.customer_email,
            subject=f"{self.shop.store_name}: refund for {order.order_id}",
            body=body,
        )
        self.events.refunded.notify(order)
        return refund_id
