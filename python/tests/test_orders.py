import pytest

from shopfront.catalog import OutOfStockError, starter_catalog
from shopfront.orders import (
    IncompleteOrderError,
    Order,
    OrderBuilder,
    format_money,
    next_order_id,
    place_order,
)
from shopfront.vendor.analytics import Analytics
from shopfront.vendor.mailer import Mailer


def an_order() -> Order:
    return (
        OrderBuilder("SF-00007")
        .email("ada@example.com")
        .name("Ada")
        .lines({"MUG-01": 2})
        .subtotal(2_500)
        .discount(250)
        .tax(428)
        .shipping(490)
        .country("DE")
        .paid_by("card")
        .transaction("txn-0001")
        .build()
    )


def test_the_builder_puts_every_part_in_its_place():
    order = an_order()
    assert order.order_id == "SF-00007"
    assert order.customer_email == "ada@example.com"
    assert order.customer_name == "Ada"
    assert order.lines == {"MUG-01": 2}
    assert order.subtotal_cents == 2_500
    assert order.discount_cents == 250
    assert order.tax_cents == 428
    assert order.shipping_cents == 490
    assert order.shipping_country == "DE"
    assert order.payment_method == "card"
    assert order.transaction_id == "txn-0001"


def test_an_order_without_a_discount_has_none():
    order = (
        OrderBuilder("SF-00008")
        .email("ada@example.com")
        .name("Ada")
        .lines({"MUG-01": 1})
        .subtotal(1_250)
        .tax(165)
        .shipping(490)
        .country("DE")
        .paid_by("card")
        .transaction("txn-0002")
        .build()
    )
    assert order.discount_cents == 0


def test_an_order_with_a_part_missing_is_refused():
    builder = OrderBuilder("SF-00009").email("ada@example.com").name("Ada")
    with pytest.raises(IncompleteOrderError, match="lines"):
        builder.build()


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
