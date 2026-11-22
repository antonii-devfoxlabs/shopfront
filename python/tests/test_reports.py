from shopfront.catalog import starter_catalog
from shopfront.orders import (
    Order,
    OrderBuilder,
    OrderEvents,
    dispatch,
    place_order,
)
from shopfront.parcels import PARCELNOW, Parcel
from shopfront.reports import sales_report
from shopfront.settings import GERMAN_SHOP


def an_order(
    lines: dict[str, int] | None = None, order_id: str = "SF-00007"
) -> Order:
    return (
        OrderBuilder(order_id)
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


A_PARCEL = Parcel(courier=PARCELNOW, number="PN-58213")


def test_the_sales_report_counts_only_the_orders_kept():
    kept = an_order(order_id="SF-00001")
    sent_back = an_order(order_id="SF-00002")
    sent_back.mark_returned()

    report = sales_report([kept, sent_back], GERMAN_SHOP)

    assert report == "Orders: 1, takings: 31.68 EUR, average: 31.68 EUR"


def test_the_sales_report_counts_dispatched_orders():
    placed = an_order(order_id="SF-00001")
    dispatched = an_order(order_id="SF-00002")
    dispatch(dispatched, A_PARCEL, OrderEvents())

    report = sales_report([placed, dispatched], GERMAN_SHOP)

    assert report == "Orders: 2, takings: 63.36 EUR, average: 31.68 EUR"


def test_the_sales_report_walks_the_order_book_itself(book):
    catalog = starter_catalog()
    for order_id in ("SF-00001", "SF-00002"):
        place_order(an_order(order_id=order_id), catalog, book, OrderEvents())
    report = sales_report(book, GERMAN_SHOP)
    assert report == "Orders: 2, takings: 63.36 EUR, average: 31.68 EUR"


def test_the_sales_report_walks_a_cursor_once(book):
    catalog = starter_catalog()
    for order_id in ("SF-00001", "SF-00002"):
        place_order(an_order(order_id=order_id), catalog, book, OrderEvents())
    report = sales_report(book.cursor(), GERMAN_SHOP)
    assert report == "Orders: 2, takings: 63.36 EUR, average: 31.68 EUR"


def test_an_empty_week_averages_nothing():
    assert sales_report([], GERMAN_SHOP) == (
        "Orders: 0, takings: 0.00 EUR, average: 0.00 EUR"
    )
