import pytest

from shopfront.catalog import starter_catalog
from shopfront.exports import returns, sales
from shopfront.orders import (
    Order,
    OrderBuilder,
    OrderEvents,
    dispatch,
    place_order,
)
from shopfront.parcels import PARCELNOW, Parcel
from shopfront.returns import Exchange, Refunds, Return, ReturnRefusedError
from shopfront.settings import GERMAN_SHOP
from shopfront.vendor.mailer import Mailer


def a_card_order() -> Order:
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


def test_a_return_refunds_the_way_the_shopper_paid(gateway):
    order = a_card_order()
    refund_id = Return(order, {"card_token": "tok-4242"}, gateway).process()
    assert gateway.refunds[-1] == {
        "id": refund_id,
        "kind": "card",
        "amount": 3_168,
        "detail": None,
    }
    assert order.status == "returned"


def test_an_exchange_keeps_the_sale_and_is_no_return():
    order = a_card_order()
    Exchange(order).process()
    assert order.status == "exchanged"
    assert sales([order]) == [order]
    assert returns([order]) == []


def test_a_returned_order_is_not_exchanged(gateway):
    order = a_card_order()
    Return(order, {"card_token": "tok-4242"}, gateway).process()
    with pytest.raises(ReturnRefusedError, match="SF-00007 is returned"):
        Exchange(order).process()


def test_a_dispatched_order_can_be_sent_back(gateway):
    order = a_card_order()
    dispatch(
        order, Parcel(courier=PARCELNOW, number="PN-58213"), OrderEvents()
    )
    Return(order, {"card_token": "tok-4242"}, gateway).process()
    assert order.status == "returned"


def test_a_refund_gives_the_money_back_and_tells_the_shopper(gateway):
    order = a_card_order()
    place_order(order, starter_catalog(), OrderEvents())
    mailer = Mailer()
    refunds = Refunds(
        gateway=gateway, mailer=mailer, shop=GERMAN_SHOP, events=OrderEvents()
    )

    refund_id = refunds.refund("SF-00007", {"card_token": "tok-4242"})

    assert gateway.refunds[-1]["id"] == refund_id
    assert gateway.refunds[-1]["amount"] == 3_168
    assert order.status == "returned"
    assert mailer.outbox == [
        {
            "from": "orders@shopfront.example",
            "to": "ada@example.com",
            "subject": "Shopfront: refund for SF-00007",
            "body": "Hi Ada, we have refunded 31.68 EUR.",
        }
    ]


def test_a_gift_return_refunds_onto_a_gift_card(gateway):
    order = a_card_order()
    details = {"code": "GIFT-2026-0001"}
    refund_id = Return(order, details, gateway, to="gift_card").process()
    assert gateway.refunds[-1] == {
        "id": refund_id,
        "kind": "gift_card",
        "amount": 3_168,
        "detail": "GIFT-2026-0001",
    }
    assert order.status == "returned"


def test_a_gift_sent_back_to_the_desk_is_refunded_onto_a_gift_card(gateway):
    order = a_card_order()
    place_order(order, starter_catalog(), OrderEvents())
    refunds = Refunds(
        gateway=gateway,
        mailer=Mailer(),
        shop=GERMAN_SHOP,
        events=OrderEvents(),
    )

    refunds.refund("SF-00007", {"code": "GIFT-2026-0001"}, to="gift_card")

    assert gateway.refunds[-1]["kind"] == "gift_card"
    assert gateway.refunds[-1]["detail"] == "GIFT-2026-0001"


@pytest.mark.parametrize(
    ("to", "details"),
    [
        (None, {"card_token": "tok-4242"}),
        ("gift_card", {"code": "GIFT-2026-0001"}),
    ],
)
def test_an_order_is_returned_once(to, details, gateway):
    order = a_card_order()
    Return(order, details, gateway, to).process()
    refunds_before = len(gateway.refunds)
    with pytest.raises(ReturnRefusedError, match="SF-00007 is returned"):
        Return(order, details, gateway, to).process()
    assert len(gateway.refunds) == refunds_before


def test_a_refund_is_announced_once_the_money_is_back(gateway):
    order = a_card_order()
    events = OrderEvents()
    place_order(order, starter_catalog(), events)
    told: list[str] = []
    events.refunded.subscribe(lambda refunded: told.append(refunded.status))
    refunds = Refunds(
        gateway=gateway, mailer=Mailer(), shop=GERMAN_SHOP, events=events
    )

    refunds.refund("SF-00007", {"card_token": "tok-4242"})

    assert told == ["returned"]
