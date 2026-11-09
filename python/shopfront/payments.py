"""Taking the money, and giving it back, in whichever way the shopper chose."""

from collections.abc import Callable
from typing import Protocol

from shopfront import settings
from shopfront.vendor.payment_gateway import PaymentGateway


class UnsupportedPaymentMethodError(Exception):
    pass


class MissingPaymentDetailError(Exception):
    pass


# One client per merchant account, made the first time it is needed.
_gateways: dict[str, PaymentGateway] = {}


def gateway() -> PaymentGateway:
    """The payment gateway of the shop that is current now."""
    merchant = settings.current.merchant_id
    client = _gateways.get(merchant)
    if client is None:
        client = PaymentGateway(merchant=merchant)
        _gateways[merchant] = client
    return client


class PaymentMethod(Protocol):
    def charge(self, amount_cents: int) -> str: ...

    def refund(self, amount_cents: int) -> str: ...


class Card:
    def __init__(self, card_token: str) -> None:
        self.card_token = card_token

    def charge(self, amount_cents: int) -> str:
        return gateway().charge_card(self.card_token, amount_cents)

    def refund(self, amount_cents: int) -> str:
        return gateway().refund_card(self.card_token, amount_cents)


class PayPal:
    def __init__(self, payer_email: str) -> None:
        self.payer_email = payer_email

    def charge(self, amount_cents: int) -> str:
        return gateway().charge_paypal(self.payer_email, amount_cents)

    def refund(self, amount_cents: int) -> str:
        return gateway().refund_paypal(self.payer_email, amount_cents)


class Wallet:
    def __init__(self, wallet: str, wallet_token: str) -> None:
        self.wallet = wallet
        self.wallet_token = wallet_token

    def charge(self, amount_cents: int) -> str:
        return gateway().charge_wallet(
            self.wallet, self.wallet_token, amount_cents
        )

    def refund(self, amount_cents: int) -> str:
        return gateway().refund_wallet(
            self.wallet, self.wallet_token, amount_cents
        )


class BankTransfer:
    def __init__(self, order_id: str) -> None:
        self.order_id = order_id

    def charge(self, amount_cents: int) -> str:
        reference = f"SHOPFRONT-{self.order_id}"
        return gateway().expect_transfer(amount_cents, reference)

    def refund(self, amount_cents: int) -> str:
        reference = f"SHOPFRONT-{self.order_id}"
        return gateway().send_transfer(amount_cents, reference)


class GiftCard:
    def __init__(self, code: str) -> None:
        self.code = code

    def charge(self, amount_cents: int) -> str:
        return gateway().redeem_gift_card(self.code, amount_cents)

    def refund(self, amount_cents: int) -> str:
        return gateway().top_up_gift_card(self.code, amount_cents)


PAYMENT_METHODS: dict[str, Callable[[dict], PaymentMethod]] = {
    "card": lambda details: Card(required(details, "card_token")),
    "paypal": lambda details: PayPal(required(details, "payer_email")),
    "apple_pay": lambda details: Wallet(
        "apple_pay", required(details, "wallet_token")
    ),
    "google_pay": lambda details: Wallet(
        "google_pay", required(details, "wallet_token")
    ),
    "samsung_pay": lambda details: Wallet(
        "samsung_pay", required(details, "wallet_token")
    ),
    "bank_transfer": lambda details: BankTransfer(
        required(details, "order_id")
    ),
    "gift_card": lambda details: GiftCard(required(details, "code")),
}


def payment(method: str, details: dict) -> PaymentMethod:
    """Create the way to pay that the method's name stands for."""
    create = PAYMENT_METHODS.get(method)
    if create is None:
        raise UnsupportedPaymentMethodError(method)
    return create(details)


def accepted() -> list[str]:
    """The names of the ways to pay, in the order checkout shows them."""
    return list(PAYMENT_METHODS)


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
