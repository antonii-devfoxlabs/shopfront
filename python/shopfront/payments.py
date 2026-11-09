"""Taking the money, and giving it back, in whichever way the shopper chose."""

from collections.abc import Callable
from typing import Protocol


class UnsupportedPaymentMethodError(Exception):
    pass


class MissingPaymentDetailError(Exception):
    pass


class Gateway(Protocol):
    """The ways to pay's slot for the payment gateway; its SDK fills it."""

    def charge_card(self, card_token: str, amount_cents: int) -> str: ...

    def charge_paypal(self, payer_email: str, amount_cents: int) -> str: ...

    def charge_wallet(
        self, wallet: str, wallet_token: str, amount_cents: int
    ) -> str: ...

    def expect_transfer(self, amount_cents: int, reference: str) -> str: ...

    def redeem_gift_card(self, code: str, amount_cents: int) -> str: ...

    def refund_card(self, card_token: str, amount_cents: int) -> str: ...

    def refund_paypal(self, payer_email: str, amount_cents: int) -> str: ...

    def refund_wallet(
        self, wallet: str, wallet_token: str, amount_cents: int
    ) -> str: ...

    def send_transfer(self, amount_cents: int, reference: str) -> str: ...

    def top_up_gift_card(self, code: str, amount_cents: int) -> str: ...


class PaymentMethod(Protocol):
    def charge(self, amount_cents: int) -> str: ...

    def refund(self, amount_cents: int) -> str: ...


class Card:
    def __init__(self, card_token: str, gateway: Gateway) -> None:
        self.card_token = card_token
        self.gateway = gateway

    def charge(self, amount_cents: int) -> str:
        return self.gateway.charge_card(self.card_token, amount_cents)

    def refund(self, amount_cents: int) -> str:
        return self.gateway.refund_card(self.card_token, amount_cents)


class PayPal:
    def __init__(self, payer_email: str, gateway: Gateway) -> None:
        self.payer_email = payer_email
        self.gateway = gateway

    def charge(self, amount_cents: int) -> str:
        return self.gateway.charge_paypal(self.payer_email, amount_cents)

    def refund(self, amount_cents: int) -> str:
        return self.gateway.refund_paypal(self.payer_email, amount_cents)


class Wallet:
    def __init__(
        self, wallet: str, wallet_token: str, gateway: Gateway
    ) -> None:
        self.wallet = wallet
        self.wallet_token = wallet_token
        self.gateway = gateway

    def charge(self, amount_cents: int) -> str:
        return self.gateway.charge_wallet(
            self.wallet, self.wallet_token, amount_cents
        )

    def refund(self, amount_cents: int) -> str:
        return self.gateway.refund_wallet(
            self.wallet, self.wallet_token, amount_cents
        )


class BankTransfer:
    def __init__(self, order_id: str, gateway: Gateway) -> None:
        self.order_id = order_id
        self.gateway = gateway

    def charge(self, amount_cents: int) -> str:
        reference = f"SHOPFRONT-{self.order_id}"
        return self.gateway.expect_transfer(amount_cents, reference)

    def refund(self, amount_cents: int) -> str:
        reference = f"SHOPFRONT-{self.order_id}"
        return self.gateway.send_transfer(amount_cents, reference)


class GiftCard:
    def __init__(self, code: str, gateway: Gateway) -> None:
        self.code = code
        self.gateway = gateway

    def charge(self, amount_cents: int) -> str:
        return self.gateway.redeem_gift_card(self.code, amount_cents)

    def refund(self, amount_cents: int) -> str:
        return self.gateway.top_up_gift_card(self.code, amount_cents)


PAYMENT_METHODS: dict[str, Callable[[dict, Gateway], PaymentMethod]] = {
    "card": lambda details, gateway: Card(
        required(details, "card_token"), gateway
    ),
    "paypal": lambda details, gateway: PayPal(
        required(details, "payer_email"), gateway
    ),
    "apple_pay": lambda details, gateway: Wallet(
        "apple_pay", required(details, "wallet_token"), gateway
    ),
    "google_pay": lambda details, gateway: Wallet(
        "google_pay", required(details, "wallet_token"), gateway
    ),
    "samsung_pay": lambda details, gateway: Wallet(
        "samsung_pay", required(details, "wallet_token"), gateway
    ),
    "bank_transfer": lambda details, gateway: BankTransfer(
        required(details, "order_id"), gateway
    ),
    "gift_card": lambda details, gateway: GiftCard(
        required(details, "code"), gateway
    ),
}


def payment(method: str, details: dict, gateway: Gateway) -> PaymentMethod:
    """Create the way to pay that the method's name stands for."""
    create = PAYMENT_METHODS.get(method)
    if create is None:
        raise UnsupportedPaymentMethodError(method)
    return create(details, gateway)


def accepted() -> list[str]:
    """The names of the ways to pay, in the order checkout shows them."""
    return list(PAYMENT_METHODS)


def pay(
    method: str, amount_cents: int, details: dict, gateway: Gateway
) -> str:
    """Charge the shopper and return the gateway's transaction id."""
    return payment(method, details, gateway).charge(amount_cents)


def refund(
    method: str, amount_cents: int, details: dict, gateway: Gateway
) -> str:
    """Give the shopper's money back and return the gateway's refund id."""
    return payment(method, details, gateway).refund(amount_cents)


def required(details: dict, name: str) -> str:
    value = details.get(name)
    if value is None:
        raise MissingPaymentDetailError(name)
    return value
