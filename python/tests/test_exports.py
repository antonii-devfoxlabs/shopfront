import json

from shopfront.exports import CsvExport, JsonExport, OrderExport, euros
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
    order("SF-00004", "returned"),
]


def test_csv_lists_placed_orders_in_order():
    assert CsvExport().export(ORDERS) == (
        "order_id,email,country,payment,total\n"
        "SF-00001,ada@example.com,DE,card,19.05\n"
        "SF-00002,ada@example.com,DE,card,19.05\n"
        "total,2,,,38.10\n"
    )


def test_csv_ends_with_the_count_and_the_sum_of_the_sales():
    text = CsvExport().export([order("SF-00001")])
    assert text.endswith(
        "SF-00001,ada@example.com,DE,card,19.05\ntotal,1,,,19.05\n"
    )


def test_csv_leaves_out_returned_orders():
    text = CsvExport().export(
        [order("SF-00001"), order("SF-00002", "returned")]
    )
    assert "SF-00002" not in text


def test_json_leaves_out_returned_orders():
    text = JsonExport().export(
        [order("SF-00001"), order("SF-00002", "returned")]
    )
    assert "SF-00002" not in text


def test_json_lists_the_same_orders():
    records = json.loads(JsonExport().export(ORDERS))
    assert [record["order_id"] for record in records] == [
        "SF-00001",
        "SF-00002",
    ]
    assert records[0]["total"] == "19.05"


def test_json_ends_with_its_records():
    assert JsonExport().export(ORDERS).endswith("  }\n]\n")


def test_json_keeps_letters_outside_ascii():
    text = JsonExport().export([order("SF-00001", email="zoë@example.com")])
    assert '"zoë@example.com"' in text


def test_a_new_format_defines_only_its_own_step():
    class OrderIds(OrderExport):
        def write(self, records: list[dict[str, str]]) -> str:
            return " ".join(sale["order_id"] for sale in records)

    assert OrderIds().export(ORDERS) == "SF-00001 SF-00002"


def test_euros_keeps_two_digits_of_cents():
    assert [euros(5), euros(1_905), euros(100_000)] == [
        "0.05",
        "19.05",
        "1000.00",
    ]
