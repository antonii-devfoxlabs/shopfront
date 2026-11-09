"""Orders sent back, and the money that goes back with them."""

from shopfront.orders import Order
from shopfront.payments import PaymentMethod, payment


class ReturnRefusedError(Exception):
    pass


class UnsupportedReturnError(Exception):
    pass


class Return:
    """The shopper who paid sends the order back."""

    def __init__(self, order: Order, details: dict) -> None:
        self.order = order
        self.details = details

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
        return payment(self.order.payment_method, self.details)


class GiftReturn(Return):
    """The person who got the order as a gift sends it back."""

    def destination(self) -> PaymentMethod:
        return payment("gift_card", self.details)


RETURNS: dict[str, type[Return]] = {
    "standard": Return,
    "gift": GiftReturn,
}


def return_for(kind: str, order: Order, details: dict) -> Return:
    """Create the return that the kind's name stands for."""
    create = RETURNS.get(kind)
    if create is None:
        raise UnsupportedReturnError(kind)
    return create(order, details)
