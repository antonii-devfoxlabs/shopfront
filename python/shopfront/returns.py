"""Orders sent back, and the money that goes back with them."""

from dataclasses import dataclass

from shopfront.orders import Order, OrderBook, format_money
from shopfront.payments import Gateway, PaymentMethod, payment
from shopfront.settings import Settings
from shopfront.vendor.mailer import Mailer


class ReturnRefusedError(Exception):
    pass


class Return:
    """The shopper who paid sends the order back."""

    def __init__(self, order: Order, details: dict, gateway: Gateway) -> None:
        self.order = order
        self.details = details
        self.gateway = gateway

    def process(self) -> str:
        """Give the money back once, and mark the order returned."""
        if self.order.status != "placed":
            raise ReturnRefusedError(
                f"{self.order.order_id} is {self.order.status}"
            )
        refund_id = self.destination().refund(self.order.total_cents)
        self.order.status = "returned"
        return refund_id

    def destination(self) -> PaymentMethod:
        """Create the way to pay that the money goes back to."""
        return payment(self.order.payment_method, self.details, self.gateway)


class GiftReturn(Return):
    """The person who got the order as a gift sends it back."""

    def destination(self) -> PaymentMethod:
        return payment("gift_card", self.details, self.gateway)


@dataclass(frozen=True, kw_only=True)
class Refunds:
    """One call that gives an order's money back, and tells the shopper.

    The return page builds it once with its parts and calls refund().
    """

    gateway: Gateway
    mailer: Mailer
    shop: Settings

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
