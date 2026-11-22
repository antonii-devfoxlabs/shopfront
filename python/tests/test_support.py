from shopfront.catalog import starter_catalog
from shopfront.orders import (
    Order,
    OrderBuilder,
    OrderEvents,
    dispatch,
    place_order,
)
from shopfront.parcels import SWIFTSHIP, Parcel
from shopfront.support import where_is


def a_placed_order() -> Order:
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
    place_order(order, starter_catalog(), OrderEvents())
    return order


def test_where_is_a_placed_order():
    a_placed_order()
    assert where_is("SF-00001") == "SF-00001 is placed"


def test_where_is_a_dispatched_order_links_its_parcel():
    order = a_placed_order()
    dispatch(
        order, Parcel(courier=SWIFTSHIP, number="SW-0072"), OrderEvents()
    )
    assert where_is("SF-00001") == (
        "SF-00001 is dispatched: https://swiftship.example/t/SW-0072"
    )
