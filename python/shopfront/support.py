"""What the support team's page asks Shopfront."""

from shopfront.orders import OrderBook, status_of


class CancelRefusedError(Exception):
    pass


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
    order = book.find(order_id)
    if not status_of(order).returnable:
        raise CancelRefusedError(f"{order.order_id} is {order.status}")
    order.status = "cancelled"
