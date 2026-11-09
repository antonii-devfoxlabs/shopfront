import pytest

from shopfront.catalog import starter_catalog
from shopfront.orders import Order, OrderBuilder, place_order
from shopfront.payments import Card, GiftCard
from shopfront.returns import (
    GiftReturn,
    Return,
    ReturnRefusedError,
    return_order,
)
from shopfront.settings import GERMAN_SHOP
from shopfront.vendor.analytics import Analytics
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


def test_an_order_is_returned_by_its_number(gateway):
    order = a_card_order()
    place_order(order, starter_catalog(), Mailer(), Analytics(), GERMAN_SHOP)
    refund_id = return_order("SF-00007", {"card_token": "tok-4242"}, gateway)
    assert gateway.refunds[-1]["id"] == refund_id
    assert order.status == "returned"


def test_a_gift_return_refunds_onto_a_gift_card(gateway):
    order = a_card_order()
    details = {"code": "GIFT-2026-0001"}
    refund_id = GiftReturn(order, details, gateway).process()
    assert gateway.refunds[-1] == {
        "id": refund_id,
        "kind": "gift_card",
        "amount": 3_168,
        "detail": "GIFT-2026-0001",
    }
    assert order.status == "returned"


@pytest.mark.parametrize(
    ("return_class", "details", "expected"),
    [
        (Return, {"card_token": "tok-4242"}, Card),
        (GiftReturn, {"code": "GIFT-2026-0001"}, GiftCard),
    ],
)
def test_each_return_creates_its_destination(
    return_class, details, expected, gateway
):
    refunds_before = len(gateway.refunds)
    destination = return_class(a_card_order(), details, gateway).destination()
    assert isinstance(destination, expected)
    assert len(gateway.refunds) == refunds_before


@pytest.mark.parametrize(
    ("return_class", "details"),
    [
        (Return, {"card_token": "tok-4242"}),
        (GiftReturn, {"code": "GIFT-2026-0001"}),
    ],
)
def test_an_order_is_returned_once(return_class, details, gateway):
    order = a_card_order()
    return_class(order, details, gateway).process()
    refunds_before = len(gateway.refunds)
    with pytest.raises(ReturnRefusedError, match="SF-00007 is returned"):
        return_class(order, details, gateway).process()
    assert len(gateway.refunds) == refunds_before
