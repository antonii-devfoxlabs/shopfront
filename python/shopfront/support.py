"""What the support team's page asks Shopfront."""

from shopfront.orders import OrderBook


def where_is(order_id: str) -> str:
    """The support page's answer to "where is my order?"."""
    order = OrderBook.instance().find(order_id)
    link = order.tracking_link()
    if link is None:
        return f"{order.order_id} is {order.status}"
    return f"{order.order_id} is {order.status}: {link}"
