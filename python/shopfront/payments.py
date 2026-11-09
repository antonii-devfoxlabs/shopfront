"""Taking the money, and giving it back, in whichever way the shopper chose."""

from typing import Protocol

from shopfront import settings
from shopfront.vendor.payment_gateway import PaymentGateway


class UnsupportedPaymentMethodError(Exception):
    pass


class MissingPaymentDetailError(Exception):
    pass


gateway = PaymentGateway(merchant=settings.MERCHANT_ID)

WALLETS = ("apple_pay", "google_pay", "samsung_pay")

ACCEPTED = (
    "card",
    "paypal",
    "apple_pay",
    "google_pay",
    "samsung_pay",
    "bank_transfer",
    "gift_card",
)


class PaymentMethod(Protocol):
    def charge(self, amount_cents: int) -> str: ...

    def refund(self, amount_cents: int) -> str: ...


class Card:
    def __init__(self, card_token: str) -> None:
        self.card_token = card_token

    def charge(self, amount_cents: int) -> str:
        return gateway.charge_card(self.card_token, amount_cents)

    def refund(self, amount_cents: int) -> str:
        return gateway.refund_card(self.card_token, amount_cents)


class PayPal:
    def __init__(self, payer_email: str) -> None:
        self.payer_email = payer_email

    def charge(self, amount_cents: int) -> str:
        return gateway.charge_paypal(self.payer_email, amount_cents)

    def refund(self, amount_cents: int) -> str:
        return gateway.refund_paypal(self.payer_email, amount_cents)


class Wallet:
    def __init__(self, wallet: str, wallet_token: str) -> None:
        self.wallet = wallet
        self.wallet_token = wallet_token

    def charge(self, amount_cents: int) -> str:
        return gateway.charge_wallet(
            self.wallet, self.wallet_token, amount_cents
        )

    def refund(self, amount_cents: int) -> str:
        return gateway.refund_wallet(
            self.wallet, self.wallet_token, amount_cents
        )


class BankTransfer:
    def __init__(self, order_id: str) -> None:
        self.order_id = order_id

    def charge(self, amount_cents: int) -> str:
        reference = f"SHOPFRONT-{self.order_id}"
        return gateway.expect_transfer(amount_cents, reference)

    def refund(self, amount_cents: int) -> str:
        reference = f"SHOPFRONT-{self.order_id}"
        return gateway.send_transfer(amount_cents, reference)


class GiftCard:
    def __init__(self, code: str) -> None:
        self.code = code

    def charge(self, amount_cents: int) -> str:
        return gateway.redeem_gift_card(self.code, amount_cents)

    def refund(self, amount_cents: int) -> str:
        return gateway.top_up_gift_card(self.code, amount_cents)


def payment(method: str, details: dict) -> PaymentMethod:
    """Create the way to pay that the method's name stands for."""
    if method == "card":
        return Card(required(details, "card_token"))
    elif method == "paypal":
        return PayPal(required(details, "payer_email"))
    elif method in WALLETS:
        return Wallet(method, required(details, "wallet_token"))
    elif method == "bank_transfer":
        return BankTransfer(required(details, "order_id"))
    elif method == "gift_card":
        return GiftCard(required(details, "code"))
    else:
        raise UnsupportedPaymentMethodError(method)


def accepted() -> list[str]:
    """The names of the ways to pay, in the order checkout shows them."""
    return list(ACCEPTED)


def pay(method: str, amount_cents: int, details: dict) -> str:
    """Charge the shopper and return the gateway's transaction id."""
    return payment(method, details).charge(amount_cents)


def refund(method: str, amount_cents: int, details: dict) -> str:
    """Give the shopper's money back and return the gateway's refund id."""
    return payment(method, details).refund(amount_cents)


def required(details: dict, name: str) -> str:
    value = details.get(name)
    if value is None:
        raise MissingPaymentDetailError(name)
    return value
