"""What the support team's page asks Shopfront."""

from shopfront import services


def where_is(order_id: str) -> str:
    """The support page's answer to "where is my order?"."""
    order = services.get("order_book").find(order_id)
    link = order.tracking_link()
    if link is None:
        return f"{order.order_id} is {order.status}"
    return f"{order.order_id} is {order.status}: {link}"
