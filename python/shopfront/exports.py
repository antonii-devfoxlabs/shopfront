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


def record(order: Order) -> dict[str, str]:
    """One sale as the accountant's fields, named as in COLUMNS."""
    total = f"{order.total_cents // 100}.{order.total_cents % 100:02d}"
    return {
        "order_id": order.order_id,
        "email": order.customer_email,
        "country": order.shipping_country,
        "payment": order.payment_method,
        "total": total,
    }


class OrderExport(ABC):
    """The accountant's export: every sale, in one format.

    export is the routine, the same for every format. A subclass defines
    only write, the one step in which the formats differ.
    """

    @final
    def export(self, orders: list[Order]) -> str:
        records = [record(order) for order in sales(orders)]
        return self.write(records) + self.closing(records)

    @abstractmethod
    def write(self, records: list[dict[str, str]]) -> str:
        """The records as this format's text."""

    @abstractmethod
    def closing(self, records: list[dict[str, str]]) -> str:
        """The text after the records."""


class CsvExport(OrderExport):
    """A header row, then a row per sale: what a spreadsheet opens."""

    def write(self, records: list[dict[str, str]]) -> str:
        rows = [",".join(COLUMNS)]
        for sale in records:
            rows.append(",".join(sale[column] for column in COLUMNS))
        return "\n".join(rows) + "\n"

    def closing(self, records: list[dict[str, str]]) -> str:
        # The bank checks the file: the number of sales and their sum.
        cents = sum(int(sale["total"].replace(".", "")) for sale in records)
        total = f"{cents // 100}.{cents % 100:02d}"
        return f"total,{len(records)},,,{total}\n"


class JsonExport(OrderExport):
    """A list of records: what the bookkeeping app reads."""

    def write(self, records: list[dict[str, str]]) -> str:
        return json.dumps(records, indent=2, ensure_ascii=False) + "\n"

    def closing(self, records: list[dict[str, str]]) -> str:
        return ""
