import json

from shopfront.exports import export_csv, export_json
from shopfront.orders import Order


def order(
    order_id: str, status: str = "placed", email: str = "ada@example.com"
) -> Order:
    placed = Order(
        order_id,
        email,
        "Ada",
        {"MUG-01": 1},
        1_250,
        0,
        165,
        490,
        "DE",
        "card",
        "txn-0001",
    )
    placed.status = status
    return placed


ORDERS = [
    order("SF-00002"),
    order("SF-00001"),
    order("SF-00003", "cancelled"),
]


def test_csv_lists_placed_orders_in_order():
    assert export_csv(ORDERS) == (
        "order_id,email,country,payment,total\n"
        "SF-00001,ada@example.com,DE,card,19.05\n"
        "SF-00002,ada@example.com,DE,card,19.05\n"
    )


def test_json_lists_the_same_orders():
    records = json.loads(export_json(ORDERS))
    assert [record["order_id"] for record in records] == [
        "SF-00001",
        "SF-00002",
    ]
    assert records[0]["total"] == "19.05"


def test_json_keeps_letters_outside_ascii():
    text = export_json([order("SF-00001", email="zoë@example.com")])
    assert '"zoë@example.com"' in text
