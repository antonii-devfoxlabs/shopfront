from itertools import islice

import pytest

from shopfront.catalog import OutOfStockError, starter_catalog
from shopfront.orders import (
    IncompleteOrderError,
    Listeners,
    Order,
    OrderBook,
    OrderBuilder,
    OrderEvents,
    OrderListener,
    UnknownOrderError,
    format_money,
    next_order_id,
    packing_slip,
    place_order,
    reorder,
    sales_report,
)
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


def events_of(*listeners: OrderListener) -> OrderEvents:
    """The subject's lists, with these listeners of placed orders."""
    events = OrderEvents()
    for listener in listeners:
        events.placed.subscribe(listener)
    return events


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
        # The point of the test: mypy refuses it as well.
        order.lines["KTL-03"] = 9  # type: ignore[index]
    assert order.lines == {"MUG-01": 2}
    assert order.total_cents == 3_168


def test_order_ids_count_up():
    first, second = next_order_id(), next_order_id()
    assert int(second[3:]) == int(first[3:]) + 1


def test_placing_an_order_takes_stock_and_tells_every_listener_in_turn():
    catalog, told = starter_catalog(), []
    place_order(
        an_order(),
        catalog,
        events_of(
            lambda order: told.append(f"first {order.order_id}"),
            lambda order: told.append(f"second {order.order_id}"),
        ),
    )
    assert catalog.find("MUG-01").stock == 38
    assert told == ["first SF-00007", "second SF-00007"]


def test_a_listener_is_told_once_the_order_is_in_the_book():
    order, found = an_order(), []
    place_order(
        order,
        starter_catalog(),
        events_of(
            lambda placed: found.append(
                OrderBook.instance().find(placed.order_id)
            )
        ),
    )
    assert found == [order]


def test_a_placed_order_is_in_the_order_book():
    order = an_order()
    place_order(order, starter_catalog(), OrderEvents())
    assert OrderBook.instance().find("SF-00007") is order


def test_the_book_lists_its_orders_in_the_order_placed():
    first = an_order(order_id="SF-00001")
    second = an_order(order_id="SF-00002")
    catalog = starter_catalog()
    for order in (first, second):
        place_order(order, catalog, OrderEvents())
    assert OrderBook.instance().orders() == [first, second]


def test_the_staff_page_shows_the_newest_orders_first():
    first = an_order(order_id="SF-00001")
    second = an_order(order_id="SF-00002")
    third = an_order(order_id="SF-00003")
    catalog = starter_catalog()
    for order in (first, second, third):
        place_order(order, catalog, OrderEvents())
    cursor = OrderBook.instance().cursor()
    assert list(islice(cursor, 2)) == [third, second]
    assert list(islice(cursor, 2)) == [first]
    assert list(islice(cursor, 2)) == []


def test_an_unknown_order_number_is_refused():
    with pytest.raises(UnknownOrderError, match="SF-99999"):
        OrderBook.instance().find("SF-99999")


def test_every_test_starts_with_an_empty_order_book():
    with pytest.raises(UnknownOrderError, match="SF-00007"):
        OrderBook.instance().find("SF-00007")


def test_every_test_starts_with_order_number_one():
    assert next_order_id() == "SF-00001"


def test_the_store_has_one_order_book():
    assert OrderBook.instance() is OrderBook.instance()
    with pytest.raises(RuntimeError, match="the store has one order book"):
        OrderBook()


def test_an_order_with_a_short_line_takes_nothing_and_tells_nobody():
    catalog = starter_catalog()
    told: list[Order] = []
    order = an_order({"MUG-01": 2, "KTL-03": 9})
    with pytest.raises(OutOfStockError):
        place_order(order, catalog, events_of(told.append))
    assert catalog.find("MUG-01").stock == 40
    assert told == []


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


def test_the_sales_report_counts_only_the_orders_kept():
    kept = an_order(order_id="SF-00001")
    sent_back = an_order(order_id="SF-00002")
    sent_back.status = "returned"

    report = sales_report([kept, sent_back], GERMAN_SHOP)

    assert report == "Orders: 1, takings: 31.68 EUR"


def test_the_sales_report_walks_the_order_book_itself():
    catalog = starter_catalog()
    for order_id in ("SF-00001", "SF-00002"):
        place_order(an_order(order_id=order_id), catalog, OrderEvents())
    report = sales_report(OrderBook.instance(), GERMAN_SHOP)
    assert report == "Orders: 2, takings: 63.36 EUR"


def test_the_sales_report_walks_a_cursor_once():
    catalog = starter_catalog()
    for order_id in ("SF-00001", "SF-00002"):
        place_order(an_order(order_id=order_id), catalog, OrderEvents())
    report = sales_report(OrderBook.instance().cursor(), GERMAN_SHOP)
    assert report == "Orders: 2, takings: 63.36 EUR"


def test_money_is_shown_in_euros():
    assert format_money(3_168, GERMAN_SHOP) == "31.68 EUR"
    assert format_money(5, GERMAN_SHOP) == "0.05 EUR"
    assert format_money(-205, GERMAN_SHOP) == "-2.05 EUR"


def test_every_subscriber_is_told_in_the_order_they_subscribed():
    listeners, told = Listeners(), []
    listeners.subscribe(lambda order: told.append(f"first {order.order_id}"))
    listeners.subscribe(lambda order: told.append(f"second {order.order_id}"))
    listeners.notify(an_order())
    assert told == ["first SF-00007", "second SF-00007"]


def test_a_listener_subscribed_twice_is_told_once():
    listeners = Listeners()
    told: list[Order] = []
    listeners.subscribe(told.append)
    listeners.subscribe(told.append)
    listeners.notify(an_order())
    assert len(told) == 1


def test_an_unsubscribed_listener_is_told_nothing_more():
    listeners = Listeners()
    told: list[Order] = []
    listeners.subscribe(told.append)
    listeners.notify(an_order(order_id="SF-00001"))
    listeners.unsubscribe(told.append)
    listeners.notify(an_order(order_id="SF-00002"))
    assert [order.order_id for order in told] == ["SF-00001"]


def test_unsubscribing_a_listener_that_is_not_on_the_list_is_fine():
    listeners = Listeners()
    listeners.unsubscribe(print)
    listeners.notify(an_order())


def test_cancelling_takes_the_listener_off_the_list():
    listeners, told = Listeners(), []
    cancel = listeners.subscribe(lambda order: told.append(order.order_id))
    listeners.notify(an_order(order_id="SF-00001"))
    cancel()
    listeners.notify(an_order(order_id="SF-00002"))
    assert told == ["SF-00001"]
    assert len(listeners) == 0


def test_cancelling_twice_is_fine():
    listeners = Listeners()
    cancel = listeners.subscribe(print)
    cancel()
    cancel()
    assert len(listeners) == 0


def test_a_listener_that_leaves_while_told_does_not_hide_the_next():
    listeners = Listeners()
    told: list[Order] = []

    def leave(order: Order) -> None:
        listeners.unsubscribe(leave)

    listeners.subscribe(leave)
    listeners.subscribe(told.append)
    listeners.notify(an_order())
    assert len(told) == 1


def test_a_listener_that_joins_while_told_hears_from_the_next_order():
    listeners = Listeners()
    told: list[Order] = []

    def join(order: Order) -> None:
        listeners.subscribe(told.append)

    listeners.subscribe(join)
    listeners.notify(an_order(order_id="SF-00001"))
    listeners.notify(an_order(order_id="SF-00002"))
    assert [order.order_id for order in told] == ["SF-00002"]


def test_a_listener_hears_only_the_news_it_subscribed_to():
    events = OrderEvents()
    told: list[Order] = []
    events.refunded.subscribe(told.append)
    events.placed.notify(an_order())
    assert told == []
