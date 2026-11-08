"""Orders exported for the accountant: as CSV, and as JSON."""

import json

from shopfront.orders import Order


def export_csv(orders: list[Order]) -> str:
    rows = ["order_id,email,country,payment,total"]
    for order in sorted(orders, key=lambda order: order.order_id):
        if order.status == "cancelled":
            continue
        total = f"{order.total_cents // 100}.{order.total_cents % 100:02d}"
        rows.append(
            f"{order.order_id},{order.customer_email},"
            f"{order.shipping_country},{order.payment_method},{total}"
        )
    return "\n".join(rows) + "\n"


def export_json(orders: list[Order]) -> str:
    records = []
    for order in sorted(orders, key=lambda order: order.order_id):
        if order.status == "cancelled":
            continue
        total = f"{order.total_cents // 100}.{order.total_cents % 100:02d}"
        records.append(
            {
                "order_id": order.order_id,
                "email": order.customer_email,
                "country": order.shipping_country,
                "payment": order.payment_method,
                "total": total,
            }
        )
    return json.dumps(records, indent=2, ensure_ascii=False) + "\n"
