"""Taking the money, in whichever way the shopper chose."""

from typing import Protocol

from shopfront import settings
from shopfront.vendor.payment_gateway import PaymentGateway


class UnsupportedPaymentMethodError(Exception):
    pass


class MissingPaymentDetailError(Exception):
    pass


gateway = PaymentGateway(merchant=settings.MERCHANT_ID)

WALLETS = ("apple_pay", "google_pay", "samsung_pay")


class PaymentMethod(Protocol):
    def charge(self, amount_cents: int) -> str: ...


class Card:
    def __init__(self, card_token: str) -> None:
        self.card_token = card_token

    def charge(self, amount_cents: int) -> str:
        return gateway.charge_card(self.card_token, amount_cents)


class PayPal:
    def __init__(self, payer_email: str) -> None:
        self.payer_email = payer_email

    def charge(self, amount_cents: int) -> str:
        return gateway.charge_paypal(self.payer_email, amount_cents)


class Wallet:
    def __init__(self, wallet: str, wallet_token: str) -> None:
        self.wallet = wallet
        self.wallet_token = wallet_token

    def charge(self, amount_cents: int) -> str:
        return gateway.charge_wallet(
            self.wallet, self.wallet_token, amount_cents
        )


class BankTransfer:
    def __init__(self, order_id: str) -> None:
        self.order_id = order_id

    def charge(self, amount_cents: int) -> str:
        reference = f"SHOPFRONT-{self.order_id}"
        return gateway.expect_transfer(amount_cents, reference)


class GiftCard:
    def __init__(self, code: str) -> None:
        self.code = code

    def charge(self, amount_cents: int) -> str:
        return gateway.redeem_gift_card(self.code, amount_cents)


def pay(method: str, amount_cents: int, details: dict) -> str:
    """Charge the shopper and return the gateway's transaction id."""
    payment: PaymentMethod
    if method == "card":
        payment = Card(required(details, "card_token"))
    elif method == "paypal":
        payment = PayPal(required(details, "payer_email"))
    elif method in WALLETS:
        payment = Wallet(method, required(details, "wallet_token"))
    elif method == "bank_transfer":
        payment = BankTransfer(required(details, "order_id"))
    elif method == "gift_card":
        payment = GiftCard(required(details, "code"))
    else:
        raise UnsupportedPaymentMethodError(method)
    return payment.charge(amount_cents)


def required(details: dict, name: str) -> str:
    value = details.get(name)
    if value is None:
        raise MissingPaymentDetailError(name)
    return value
