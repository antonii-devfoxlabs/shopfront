import re

import pytest

from shopfront.gateways import TimedGateway
from shopfront.payments import accepted, pay, refund
from shopfront.vendor.payment_gateway import (
    DECLINED_TOKEN,
    PaymentDeclinedError,
)

# One set of details that every way to pay can take its own from.
EVERY_DETAIL = {
    "card_token": "tok-4242",
    "payer_email": "ada@example.com",
    "wallet_token": "wallet-1",
    "order_id": "SF-00042",
    "code": "GIFT-2026-0001",
}


def test_the_timed_gateway_passes_each_answer_on(gateway):
    timed = TimedGateway(gateway, lambda line: None)
    assert timed.charge_card("tok-4242", 1_000) == "txn-0001"
    assert timed.refund_card("tok-4242", 1_000) == "rfd-0001"
    assert gateway.charges[-1]["amount"] == 1_000


def test_the_timed_gateway_logs_each_call_and_its_time(gateway):
    lines: list[str] = []
    timed = TimedGateway(gateway, lines.append)
    timed.charge_card("tok-4242", 1_000)
    timed.refund_card("tok-4242", 1_000)
    assert len(lines) == 2
    assert re.fullmatch(r"gateway charge_card in \d+ ms", lines[0])
    assert re.fullmatch(r"gateway refund_card in \d+ ms", lines[1])


def test_a_declined_card_still_reaches_the_caller(gateway):
    lines: list[str] = []
    timed = TimedGateway(gateway, lines.append)
    with pytest.raises(PaymentDeclinedError):
        timed.charge_card(DECLINED_TOKEN, 1_000)
    assert lines == []


def test_every_way_to_pay_charges_and_refunds_through_it(gateway):
    lines: list[str] = []
    timed = TimedGateway(gateway, lines.append)
    for method in accepted():
        pay(method, 1_000, EVERY_DETAIL, timed)
        refund(method, 1_000, EVERY_DETAIL, timed)
    calls = {line.split()[1] for line in lines}
    assert len(lines) == 14
    assert calls == {
        "charge_card",
        "charge_paypal",
        "charge_wallet",
        "expect_transfer",
        "redeem_gift_card",
        "refund_card",
        "refund_paypal",
        "refund_wallet",
        "send_transfer",
        "top_up_gift_card",
    }
