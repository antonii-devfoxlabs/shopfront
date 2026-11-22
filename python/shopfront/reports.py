"""The owner's Monday line, from the orders the shop has kept."""

from collections.abc import Iterable

from shopfront.money import format_money
from shopfront.orders import Order, status_of
from shopfront.settings import Settings


def sales_report(orders: Iterable[Order], shop: Settings) -> str:
    """The owner's Monday line: the orders kept, what they took, and the
    average order, rounded down to the cent."""
    count = 0
    takings = 0
    for order in orders:
        if status_of(order).sale:
            count += 1
            takings += order.total_cents
    average = takings // count if count else 0
    return (
        f"Orders: {count}, takings: {format_money(takings, shop)}, "
        f"average: {format_money(average, shop)}"
    )
