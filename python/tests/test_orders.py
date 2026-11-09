import pytest

from shopfront import settings
from shopfront.catalog import OutOfStockError, starter_catalog
from shopfront.orders import (
    IncompleteOrderError,
    Order,
    OrderBuilder,
    UnknownOrderError,
    book,
    format_money,
    next_order_id,
    packing_slip,
    place_order,
    reorder,
)
from shopfront.vendor.analytics import Analytics
from shopfront.vendor.mailer import Mailer


def an_order(lines: dict[str, int] | None = None) -> Order:
    return (
        OrderBuilder("SF-00007")
        .email("ada@example.com")
        .name("Ada")
        .lines(lines or {"MUG-01": 2})
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


def test_an_order_again_keeps_no_prices():
    builder = reorder(an_order(), "SF-00010")
    with pytest.raises(IncompleteOrderError, match="subtotal"):
        builder.build()


def test_the_total_adds_everything_up():
    assert an_order().total_cents == 3_168


def test_a_built_order_cannot_change():
    order = an_order()
    with pytest.raises(AttributeError, match="tax_cents cannot change"):
        order.tax_cents = 0
    with pytest.raises(TypeError):
        order.lines["KTL-03"] = 9
    assert order.lines == {"MUG-01": 2}
    assert order.total_cents == 3_168


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


def test_a_placed_order_is_in_the_order_book():
    order = an_order()
    place_order(order, starter_catalog(), Mailer(), Analytics())
    assert book.find("SF-00007") is order


def test_an_unknown_order_number_is_refused():
    with pytest.raises(UnknownOrderError, match="SF-99999"):
        book.find("SF-99999")


def test_the_dutch_shop_emails_from_its_own_address(monkeypatch):
    monkeypatch.setattr(settings, "current", settings.DUTCH_SHOP)
    mailer = Mailer()
    place_order(an_order(), starter_catalog(), mailer, Analytics())
    assert mailer.outbox[0]["from"] == "orders.nl@shopfront.example"
    assert mailer.outbox[0]["subject"] == "Shopfront NL: order SF-00007"


def test_an_order_with_a_short_line_takes_nothing_and_sends_nothing():
    catalog, mailer, analytics = starter_catalog(), Mailer(), Analytics()
    order = an_order({"MUG-01": 2, "KTL-03": 9})
    with pytest.raises(OutOfStockError):
        place_order(order, catalog, mailer, analytics)
    assert catalog.find("MUG-01").stock == 40
    assert mailer.outbox == []
    assert analytics.events == []


def test_a_packing_slip_lists_every_line():
    assert packing_slip(an_order()) == ["2 x MUG-01"]


def test_a_parcel_of_40_eur_or_more_gets_a_free_sample():
    order = (
        reorder(an_order(), "SF-00011")
        .lines({"MUG-01": 4})
        .subtotal(5_000)
        .tax(950)
        .shipping(0)
        .paid_by("card")
        .transaction("txn-0003")
        .build()
    )
    assert packing_slip(order) == ["4 x MUG-01", "1 x TEA-SAMPLE"]


def test_money_is_shown_in_euros():
    assert format_money(3_168) == "31.68 EUR"
    assert format_money(5) == "0.05 EUR"
    assert format_money(-205) == "-2.05 EUR"
