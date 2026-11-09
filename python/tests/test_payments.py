import pytest

from shopfront import payments
from shopfront.payments import (
    MissingPaymentDetailError,
    UnsupportedPaymentMethodError,
    pay,
)
from shopfront.vendor.payment_gateway import (
    PaymentDeclinedError,
    PaymentGateway,
)


def last_charge() -> dict:
    return payments.gateway.charges[-1]


@pytest.mark.parametrize(
    ("method", "details", "detail"),
    [
        ("card", {"card_token": "tok-4242"}, None),
        ("paypal", {"payer_email": "ada@example.com"}, "ada@example.com"),
        ("apple_pay", {"wallet_token": "wallet-1"}, None),
        ("google_pay", {"wallet_token": "wallet-2"}, None),
        ("samsung_pay", {"wallet_token": "wallet-3"}, None),
        ("bank_transfer", {"order_id": "SF-00042"}, "SHOPFRONT-SF-00042"),
        ("gift_card", {"code": "GIFT-2026-0001"}, "GIFT-2026-0001"),
    ],
)
def test_every_method_charges_the_gateway(method, details, detail):
    transaction_id = pay(method, 1_000, details)
    assert last_charge() == {
        "id": transaction_id,
        "kind": method,
        "amount": 1_000,
        "detail": detail,
    }


def test_a_declined_card_raises():
    with pytest.raises(PaymentDeclinedError):
        pay("card", 1_000, {"card_token": "declined"})


@pytest.mark.parametrize("wallet", ["apple_pay", "google_pay", "samsung_pay"])
def test_a_declined_wallet_raises(wallet):
    with pytest.raises(PaymentDeclinedError, match=wallet):
        pay(wallet, 1_000, {"wallet_token": "declined"})


def test_a_missing_detail_is_an_error_not_a_charge():
    charges_before = len(payments.gateway.charges)
    with pytest.raises(MissingPaymentDetailError, match="card_token"):
        pay("card", 1_000, {})
    assert len(payments.gateway.charges) == charges_before


def test_a_detail_set_to_none_is_missing():
    charges_before = len(payments.gateway.charges)
    with pytest.raises(MissingPaymentDetailError, match="card_token"):
        pay("card", 1_000, {"card_token": None})
    assert len(payments.gateway.charges) == charges_before


def test_a_gift_card_pays_down_to_its_balance():
    gateway = PaymentGateway(merchant="test")
    gateway.redeem_gift_card("GIFT-2026-0001", 4_000)
    assert gateway.gift_cards["GIFT-2026-0001"] == 1_000
    gateway.redeem_gift_card("GIFT-2026-0001", 1_000)
    with pytest.raises(PaymentDeclinedError, match="Not enough"):
        gateway.redeem_gift_card("GIFT-2026-0001", 1)


def test_an_unknown_gift_card_is_declined():
    with pytest.raises(PaymentDeclinedError, match="No gift card"):
        PaymentGateway(merchant="test").redeem_gift_card("GIFT-0", 1)


def test_an_unknown_method_is_an_error():
    with pytest.raises(UnsupportedPaymentMethodError):
        pay("cash", 1_000, {})
