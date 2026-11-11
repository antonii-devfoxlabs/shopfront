"""The office's live sales board: every order as it comes in."""

from shopfront.orders import Order, OrderEvents, format_money
from shopfront.settings import Settings


class SalesBoard:
    """One screen's rows: the orders placed since it was opened.

    Staff open a board on the office screen and close it when they go.
    """

    def __init__(self, events: OrderEvents, shop: Settings) -> None:
        self.rows: list[str] = []
        self._shop = shop
        events.placed.subscribe(self.show)

    def show(self, order: Order) -> None:
        """Add a row for an order just placed."""
        total = format_money(order.total_cents, self._shop)
        self.rows.append(f"{order.order_id}  {total}")

    def close(self) -> None:
        """Clear the screen: whoever opened it is done with it."""
        self.rows.clear()
