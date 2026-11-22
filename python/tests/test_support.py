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
from shopfront.returns import Refunds
from shopfront.settings import GERMAN_SHOP
from shopfront.support import (
    GoodwillRefusedError,
    cancel,
    make_good,
    where_is,
)
from shopfront.vendor.mailer import Mailer
from shopfront.vendor.payment_gateway import PaymentGateway


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


def refunds_for(
    book: OrderBook, gateway: PaymentGateway, mailer: Mailer
) -> Refunds:
    return Refunds(
        gateway=gateway,
        mailer=mailer,
        shop=GERMAN_SHOP,
        book=book,
        events=OrderEvents(),
    )


def test_the_support_page_makes_good_on_a_damaged_parcel(book, gateway):
    order = a_placed_order(book)
    dispatch(
        order, Parcel(courier=SWIFTSHIP, number="SW-0072"), OrderEvents()
    )
    mailer = Mailer()
    refunds = refunds_for(book, gateway, mailer)

    make_good("SF-00001", "damaged", {"card_token": "tok-4242"}, refunds)

    assert gateway.refunds[-1]["amount"] == 1_584
    assert order.status == "dispatched"
    assert mailer.outbox[-1]["body"] == (
        "Hi Ada, sorry about your parcel: we have refunded 15.84 EUR."
    )


def test_no_goodwill_for_an_order_that_has_not_left(book, gateway):
    a_placed_order(book)
    refunds = refunds_for(book, gateway, Mailer())
    with pytest.raises(GoodwillRefusedError, match="SF-00001 is placed"):
        make_good("SF-00001", "late", {"card_token": "tok-4242"}, refunds)
    assert gateway.refunds == []


def test_a_goodwill_credit_is_not_announced_as_a_refund(book, gateway):
    order = a_placed_order(book)
    dispatch(
        order, Parcel(courier=SWIFTSHIP, number="SW-0072"), OrderEvents()
    )
    events = OrderEvents()
    told: list[str] = []
    events.refunded.subscribe(lambda refunded: told.append(refunded.order_id))
    refunds = Refunds(
        gateway=gateway,
        mailer=Mailer(),
        shop=GERMAN_SHOP,
        book=book,
        events=events,
    )

    make_good("SF-00001", "late", {"card_token": "tok-4242"}, refunds)

    assert gateway.refunds[-1]["amount"] == 316
    assert told == []
