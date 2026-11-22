"""What the support team's page asks Shopfront."""

from shopfront.orders import OrderBook


def where_is(order_id: str, book: OrderBook) -> str:
    """The support page's answer to "where is my order?", from the
    store's order book."""
    order = book.find(order_id)
    link = order.tracking_link()
    if link is None:
        return f"{order.order_id} is {order.status}"
    return f"{order.order_id} is {order.status}: {link}"
