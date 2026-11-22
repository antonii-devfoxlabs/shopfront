import pytest

from shopfront.catalog import starter_catalog
from shopfront.exports import sales
from shopfront.orders import (
    CancelRefusedError,
    Order,
    OrderBook,
    OrderBuilder,
    OrderEvents,
    UnknownOrderError,
    dispatch,
    place_order,
)
from shopfront.parcels import SWIFTSHIP, Parcel
from shopfront.support import cancel, where_is


def a_placed_order(book: OrderBook) -> Order:
    order = (
        OrderBuilder("SF-00001")
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
    place_order(order, starter_catalog(), book, OrderEvents())
    return order


def test_where_is_a_placed_order(book):
    a_placed_order(book)
    assert where_is("SF-00001", book) == "SF-00001 is placed"


def test_where_is_a_dispatched_order_links_its_parcel(book):
    order = a_placed_order(book)
    dispatch(
        order, Parcel(courier=SWIFTSHIP, number="SW-0072"), OrderEvents()
    )
    assert where_is("SF-00001", book) == (
        "SF-00001 is dispatched: https://swiftship.example/t/SW-0072"
    )


def test_the_support_page_reads_the_book_it_is_handed(book):
    a_placed_order(book)
    with pytest.raises(UnknownOrderError, match="SF-00001"):
        where_is("SF-00001", OrderBook())


def test_the_support_page_cancels_a_placed_order(book):
    order = a_placed_order(book)
    cancel("SF-00001", book)
    assert where_is("SF-00001", book) == "SF-00001 is cancelled"
    assert sales([order]) == []


def test_a_cancelled_order_is_not_cancelled_again(book):
    a_placed_order(book)
    cancel("SF-00001", book)
    with pytest.raises(CancelRefusedError, match="SF-00001 is cancelled"):
        cancel("SF-00001", book)


def test_a_dispatched_order_is_not_cancelled(book):
    order = a_placed_order(book)
    dispatch(
        order, Parcel(courier=SWIFTSHIP, number="SW-0072"), OrderEvents()
    )
    with pytest.raises(CancelRefusedError, match="SF-00001 is dispatched"):
        cancel("SF-00001", book)
    assert order.status == "dispatched"
