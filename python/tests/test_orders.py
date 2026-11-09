import pytest

from shopfront.catalog import OutOfStockError, starter_catalog
from shopfront.orders import Order, format_money, next_order_id, place_order
from shopfront.vendor.analytics import Analytics
from shopfront.vendor.mailer import Mailer


def an_order() -> Order:
    return Order(
        "SF-00007",
        "ada@example.com",
        "Ada",
        {"MUG-01": 2},
        2_500,
        250,
        428,
        490,
        "DE",
        "card",
        "txn-0001",
    )


def test_the_total_adds_everything_up():
    assert an_order().total_cents == 3_168


def test_order_ids_count_up():
    first, second = next_order_id(), next_order_id()
    assert int(second[3:]) == int(first[3:]) + 1


def test_placing_an_order_takes_stock_emails_and_tracks():
    catalog, mailer, analytics = starter_catalog(), Mailer(), Analytics()
    place_order(an_order(), catalog, mailer, analytics)
    assert catalog.find("MUG-01").stock == 38
    assert mailer.outbox[0]["from"] == "orders@shopfront.example"
    assert mailer.outbox[0]["to"] == "ada@example.com"
    assert mailer.outbox[0]["body"].startswith("Hi Ada, thank you!")
    assert "31.68 EUR" in mailer.outbox[0]["body"]
    assert analytics.events == [
        ("order_placed", {"order_id": "SF-00007", "total_cents": 3_168})
    ]


def test_an_order_with_a_short_line_takes_nothing_and_sends_nothing():
    catalog, mailer, analytics = starter_catalog(), Mailer(), Analytics()
    order = an_order()
    order.lines["KTL-03"] = 9
    with pytest.raises(OutOfStockError):
        place_order(order, catalog, mailer, analytics)
    assert catalog.find("MUG-01").stock == 40
    assert mailer.outbox == []
    assert analytics.events == []


def test_money_is_shown_in_euros():
    assert format_money(3_168) == "31.68 EUR"
    assert format_money(5) == "0.05 EUR"
    assert format_money(-205) == "-2.05 EUR"
