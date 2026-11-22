"""Orders sent back, and the money that goes back with them."""

from dataclasses import dataclass

from shopfront.money import format_money
from shopfront.orders import (
    Order,
    OrderBook,
    OrderEvents,
    status_of,
)
from shopfront.payments import Gateway, refund
from shopfront.settings import Settings
from shopfront.vendor.mailer import Mailer


class ReturnRefusedError(Exception):
    pass


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
        if not status_of(self.order).returnable:
            raise ReturnRefusedError(
                f"{self.order.order_id} is {self.order.status}"
            )
        refund_id = refund(
            self.to, self.order.total_cents, self.details, self.gateway
        )
        self.order.status = "returned"
        return refund_id


@dataclass(frozen=True, kw_only=True)
class Refunds:
    """One call that gives an order's money back, and tells the shopper.

    The return page builds it once with its parts and calls refund().
    """

    gateway: Gateway
    mailer: Mailer
    shop: Settings
    # Who hears of a refund: main subscribes them.
    events: OrderEvents

    def refund(
        self, order_id: str, details: dict, to: str | None = None
    ) -> str:
        """Give an order's money back, tell the shopper, then announce it.
        to: the way to pay the money goes back to, as Return takes it."""
        order = OrderBook.instance().find(order_id)
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
