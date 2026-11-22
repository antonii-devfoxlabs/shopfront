"""What the support team's page asks Shopfront."""

from shopfront.orders import OrderBook
from shopfront.returns import GOODWILL_PERCENT, Refunds


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


def make_good(
    order_id: str, reason: str, details: dict, refunds: Refunds
) -> str:
    """The support page gives part of the money back for a parcel that
    was late, arrived damaged or never arrived. The order stays as it is."""
    return refunds.make_good(order_id, reason, details)


def goodwill_choices() -> list[str]:
    """The lines the support page's goodwill form shows, one per reason
    the support team can pick."""
    return [
        f"{reason}: {percent} % back"
        for reason, percent in GOODWILL_PERCENT.items()
    ]
