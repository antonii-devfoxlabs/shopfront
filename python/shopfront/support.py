"""What the support team's page asks Shopfront."""

from shopfront.orders import Order, OrderBook, status_of
from shopfront.returns import Refunds


def where_is(order_id: str, book: OrderBook) -> str:
    """The support page's answer to "where is my order?", from the
    store's order book."""
    order = book.find(order_id)
    link = order.tracking_link()
    if link is None:
        return f"{order.order_id} is {order.status}"
    return f"{order.order_id} is {order.status}: {link}"


def cancel(order_id: str, book: OrderBook) -> None:
    """The support page cancels an order the shopper no longer wants:
    the store will not send it, and no longer counts it as a sale."""
    book.find(order_id).mark_cancelled()


class GoodwillRefusedError(Exception):
    pass


# The part of an order's total the support team gives back, in percent,
# by what went wrong with the parcel.
GOODWILL_PERCENT = {"late": 10, "damaged": 50}


def goodwill_cents(order: Order, reason: str) -> int:
    """What the store gives back for a parcel that went wrong: only for
    an order that has left, and is still a sale."""
    if order.parcel is None or not status_of(order).sale:
        raise GoodwillRefusedError(f"{order.order_id} is {order.status}")
    percent = GOODWILL_PERCENT.get(reason)
    if percent is None:
        raise GoodwillRefusedError(f"no goodwill for {reason}")
    return order.total_cents * percent // 100


def make_good(
    order_id: str, reason: str, details: dict, refunds: Refunds
) -> str:
    """The support page gives part of the money back for a parcel that
    was late or arrived damaged. The order stays as it is."""
    return refunds.make_good(order_id, reason, details)
