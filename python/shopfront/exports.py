"""Orders exported for the accountant: as CSV, and as JSON."""

import json
from abc import ABC, abstractmethod
from typing import final

from shopfront.orders import Order

COLUMNS = ("order_id", "email", "country", "payment", "total")


def sales(orders: list[Order]) -> list[Order]:
    """The orders the accountant counts as sales, oldest first."""
    # Only placed orders are sales: a returned one gave its money back.
    placed = [order for order in orders if order.status == "placed"]
    return sorted(placed, key=lambda order: order.order_id)


def euros(cents: int) -> str:
    """An amount in cents as euros, the way the files write it: 19.05."""
    return f"{cents // 100}.{cents % 100:02d}"


def record(order: Order) -> dict[str, str]:
    """One sale as the accountant's fields, named as in COLUMNS."""
    return {
        "order_id": order.order_id,
        "email": order.customer_email,
        "country": order.shipping_country,
        "payment": order.payment_method,
        "total": euros(order.total_cents),
    }


class OrderExport(ABC):
    """The accountant's export: every sale, in one format.

    export is the routine, the same for every format. A subclass must
    define write, the step in which the formats differ, and may define
    closing, a hook that adds nothing unless a format has a closing line.
    """

    @final
    def export(self, orders: list[Order]) -> str:
        sold = sales(orders)
        records = [record(order) for order in sold]
        return self.write(records) + self.closing(sold)

    @abstractmethod
    def write(self, records: list[dict[str, str]]) -> str:
        """The records as this format's text."""

    def closing(self, sold: list[Order]) -> str:
        """The text after the records: none, unless a format adds some."""
        return ""


class CsvExport(OrderExport):
    """A header row, then a row per sale: what a spreadsheet opens."""

    def write(self, records: list[dict[str, str]]) -> str:
        rows = [",".join(COLUMNS)]
        for sale in records:
            rows.append(",".join(sale[column] for column in COLUMNS))
        return "\n".join(rows) + "\n"

    def closing(self, sold: list[Order]) -> str:
        # The bank checks the file: the number of sales and their sum.
        total = sum(order.total_cents for order in sold)
        return f"total,{len(sold)},,,{euros(total)}\n"


class JsonExport(OrderExport):
    """A list of records: what the bookkeeping app reads."""

    def write(self, records: list[dict[str, str]]) -> str:
        return json.dumps(records, indent=2, ensure_ascii=False) + "\n"
