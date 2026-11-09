import pytest

from shopfront import payments
from shopfront.orders import Order
from shopfront.payments import Card, GiftCard
from shopfront.returns import (
    GiftReturn,
    Return,
    ReturnRefusedError,
    UnsupportedReturnError,
    return_for,
)


def a_card_order() -> Order:
    return Order(
        "SF-00007",
        "ada@example.com",
        {"MUG-01": 2},
        2_500,
        250,
        428,
        490,
        "DE",
        "card",
        "txn-0001",
    )


def test_a_return_refunds_the_way_the_shopper_paid():
    order = a_card_order()
    refund_id = Return(order, {"card_token": "tok-4242"}).process()
    assert payments.gateway.refunds[-1] == {
        "id": refund_id,
        "kind": "card",
        "amount": 3_168,
        "detail": None,
    }
    assert order.status == "returned"


def test_a_gift_return_refunds_onto_a_gift_card():
    order = a_card_order()
    details = {"code": "GIFT-2026-0001"}
    refund_id = GiftReturn(order, details).process()
    assert payments.gateway.refunds[-1] == {
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
def test_each_return_creates_its_destination(return_class, details, expected):
    refunds_before = len(payments.gateway.refunds)
    destination = return_class(a_card_order(), details).destination()
    assert isinstance(destination, expected)
    assert len(payments.gateway.refunds) == refunds_before


@pytest.mark.parametrize(
    ("return_class", "details"),
    [
        (Return, {"card_token": "tok-4242"}),
        (GiftReturn, {"code": "GIFT-2026-0001"}),
    ],
)
def test_an_order_is_returned_once(return_class, details):
    order = a_card_order()
    return_class(order, details).process()
    refunds_before = len(payments.gateway.refunds)
    with pytest.raises(ReturnRefusedError, match="SF-00007 is returned"):
        return_class(order, details).process()
    assert len(payments.gateway.refunds) == refunds_before


@pytest.mark.parametrize(
    ("kind", "expected"),
    [("standard", Return), ("gift", GiftReturn)],
)
def test_each_kind_creates_its_return(kind, expected):
    created = return_for(kind, a_card_order(), {})
    assert type(created) is expected


def test_an_unknown_kind_is_refused():
    with pytest.raises(UnsupportedReturnError, match="exchange"):
        return_for("exchange", a_card_order(), {})
