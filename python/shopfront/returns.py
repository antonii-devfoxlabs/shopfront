"""Orders sent back, and the money that goes back with them."""

from shopfront.orders import Order, OrderBook
from shopfront.payments import PaymentMethod, payment
from shopfront.vendor.payment_gateway import PaymentGateway


class ReturnRefusedError(Exception):
    pass


class Return:
    """The shopper who paid sends the order back."""

    def __init__(
        self, order: Order, details: dict, gateway: PaymentGateway
    ) -> None:
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


def return_order(
    order_id: str, details: dict, gateway: PaymentGateway
) -> str:
    """Send back an order that the shopper names by its number."""
    order = OrderBook.instance().find(order_id)
    return Return(order, details, gateway).process()
