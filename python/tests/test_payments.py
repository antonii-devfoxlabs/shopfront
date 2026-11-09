import pytest

from shopfront.payments import (
    BankTransfer,
    Card,
    GiftCard,
    MissingPaymentDetailError,
    PayPal,
    UnsupportedPaymentMethodError,
    Wallet,
    accepted,
    pay,
    payment,
    refund,
)
from shopfront.settings import DUTCH_SHOP
from shopfront.vendor.payment_gateway import (
    PaymentDeclinedError,
    PaymentGateway,
)

EVERY_METHOD = [
    ("card", {"card_token": "tok-4242"}, None),
    ("paypal", {"payer_email": "ada@example.com"}, "ada@example.com"),
    ("apple_pay", {"wallet_token": "wallet-1"}, None),
    ("google_pay", {"wallet_token": "wallet-2"}, None),
    ("samsung_pay", {"wallet_token": "wallet-3"}, None),
    ("bank_transfer", {"order_id": "SF-00042"}, "SHOPFRONT-SF-00042"),
    ("gift_card", {"code": "GIFT-2026-0001"}, "GIFT-2026-0001"),
]


@pytest.mark.parametrize(("method", "details", "detail"), EVERY_METHOD)
def test_every_method_charges_the_gateway(method, details, detail, gateway):
    transaction_id = pay(method, 1_000, details, gateway)
    assert gateway.charges[-1] == {
        "id": transaction_id,
        "kind": method,
        "amount": 1_000,
        "detail": detail,
    }


@pytest.mark.parametrize(("method", "details", "detail"), EVERY_METHOD)
def test_every_method_refunds_through_the_gateway(
    method, details, detail, gateway
):
    refund_id = refund(method, 1_000, details, gateway)
    assert gateway.refunds[-1] == {
        "id": refund_id,
        "kind": method,
        "amount": 1_000,
        "detail": detail,
    }


@pytest.mark.parametrize(
    ("create", "kind"),
    [
        (lambda gateway: Card("tok-4242", gateway), "card"),
        (lambda gateway: PayPal("ada@example.com", gateway), "paypal"),
        (
            lambda gateway: Wallet("samsung_pay", "wallet-3", gateway),
            "samsung_pay",
        ),
        (lambda gateway: BankTransfer("SF-00042", gateway), "bank_transfer"),
        (lambda gateway: GiftCard("GIFT-2026-0001", gateway), "gift_card"),
    ],
)
def test_each_way_to_pay_charges_on_its_own(create, kind, gateway):
    transaction_id = create(gateway).charge(1_000)
    assert gateway.charges[-1]["id"] == transaction_id
    assert gateway.charges[-1]["kind"] == kind


@pytest.mark.parametrize(
    ("method", "details", "expected"),
    [
        ("card", {"card_token": "tok-4242"}, Card),
        ("paypal", {"payer_email": "ada@example.com"}, PayPal),
        ("apple_pay", {"wallet_token": "wallet-1"}, Wallet),
        ("google_pay", {"wallet_token": "wallet-2"}, Wallet),
        ("samsung_pay", {"wallet_token": "wallet-3"}, Wallet),
        ("bank_transfer", {"order_id": "SF-00042"}, BankTransfer),
        ("gift_card", {"code": "GIFT-2026-0001"}, GiftCard),
    ],
)
def test_payment_creates_without_charging(method, details, expected, gateway):
    charges_before = len(gateway.charges)
    assert isinstance(payment(method, details, gateway), expected)
    assert len(gateway.charges) == charges_before


def test_a_declined_card_raises(gateway):
    with pytest.raises(PaymentDeclinedError):
        pay("card", 1_000, {"card_token": "declined"}, gateway)


@pytest.mark.parametrize("wallet", ["apple_pay", "google_pay", "samsung_pay"])
def test_a_declined_wallet_raises(wallet, gateway):
    with pytest.raises(PaymentDeclinedError, match=wallet):
        pay(wallet, 1_000, {"wallet_token": "declined"}, gateway)


def test_a_missing_detail_is_an_error_not_a_charge(gateway):
    charges_before = len(gateway.charges)
    with pytest.raises(MissingPaymentDetailError, match="card_token"):
        pay("card", 1_000, {}, gateway)
    assert len(gateway.charges) == charges_before


def test_a_detail_set_to_none_is_missing(gateway):
    charges_before = len(gateway.charges)
    with pytest.raises(MissingPaymentDetailError, match="card_token"):
        pay("card", 1_000, {"card_token": None}, gateway)
    assert len(gateway.charges) == charges_before


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


def test_an_unknown_method_is_an_error(gateway):
    with pytest.raises(UnsupportedPaymentMethodError):
        pay("cash", 1_000, {}, gateway)


def test_checkout_offers_every_way_to_pay():
    assert accepted() == [method for method, _, _ in EVERY_METHOD]


def test_the_dutch_shop_charges_its_own_merchant_account():
    dutch = PaymentGateway(merchant=DUTCH_SHOP.merchant_id)
    transaction_id = pay("card", 2_500, {"card_token": "tok-4242"}, dutch)
    assert dutch.merchant == "shopfront-nl"
    assert dutch.charges[-1]["id"] == transaction_id


def test_one_payment_one_charge(gateway):
    pay("card", 1_000, {"card_token": "tok-4242"}, gateway)
    assert len(gateway.charges) == 1
