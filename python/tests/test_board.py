from shopfront.board import SalesBoard
from shopfront.orders import Order, OrderBuilder, OrderEvents
from shopfront.settings import GERMAN_SHOP


def an_order(order_id: str) -> Order:
    return (
        OrderBuilder(order_id)
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


def test_a_board_shows_each_order_placed_while_it_is_open():
    events = OrderEvents()
    board = SalesBoard(events, GERMAN_SHOP)
    events.placed.notify(an_order("SF-00001"))
    events.placed.notify(an_order("SF-00002"))
    assert board.rows == ["SF-00001  31.68 EUR", "SF-00002  31.68 EUR"]


def test_a_closed_board_is_cleared():
    events = OrderEvents()
    board = SalesBoard(events, GERMAN_SHOP)
    events.placed.notify(an_order("SF-00001"))
    board.close()
    assert board.rows == []
