from shopfront import payments
from shopfront.orders import Order
from shopfront.returns import GiftReturn, Return


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
