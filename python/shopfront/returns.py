"""Orders sent back, and the money that goes back with them."""

from shopfront.orders import Order
from shopfront.payments import payment


class Return:
    """The shopper who paid sends the order back."""

    def __init__(self, order: Order, details: dict) -> None:
        self.order = order
        self.details = details

    def process(self) -> str:
        """Give the money back and mark the order returned."""
        destination = payment(self.order.payment_method, self.details)
        refund_id = destination.refund(self.order.total_cents)
        self.order.status = "returned"
        return refund_id


class GiftReturn(Return):
    """The person who got the order as a gift sends it back."""

    def process(self) -> str:
        """Give the money back and mark the order returned."""
        destination = payment("gift_card", self.details)
        refund_id = destination.refund(self.order.total_cents)
        self.order.status = "returned"
        return refund_id
