"""Orders exported for the accountant: as CSV, and as JSON."""

import json

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


def export_csv(orders: list[Order]) -> str:
    records = [record(order) for order in sales(orders)]
    rows = [",".join(COLUMNS)]
    for sale in records:
        rows.append(",".join(sale[column] for column in COLUMNS))
    return "\n".join(rows) + "\n"


def export_json(orders: list[Order]) -> str:
    records = [record(order) for order in sales(orders)]
    return json.dumps(records, indent=2, ensure_ascii=False) + "\n"
