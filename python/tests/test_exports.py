import json

from shopfront.exports import export_csv, export_json
from shopfront.orders import Order, OrderBuilder


def order(
    order_id: str, status: str = "placed", email: str = "ada@example.com"
) -> Order:
    placed = (
        OrderBuilder(order_id)
        .email(email)
        .name("Ada")
        .lines({"MUG-01": 1})
        .subtotal(1_250)
        .tax(165)
        .shipping(490)
        .country("DE")
        .paid_by("card")
        .transaction("txn-0001")
        .build()
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


def test_csv_leaves_out_returned_orders():
    text = export_csv([order("SF-00001"), order("SF-00002", "returned")])
    assert "SF-00002" not in text


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
