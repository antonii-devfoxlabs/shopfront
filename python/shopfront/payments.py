"""Taking the money, in whichever way the shopper chose."""

from shopfront import settings
from shopfront.vendor.payment_gateway import PaymentGateway


class UnsupportedPaymentMethodError(Exception):
    pass


class MissingPaymentDetailError(Exception):
    pass


gateway = PaymentGateway(merchant=settings.MERCHANT_ID)


def pay(method: str, amount_cents: int, details: dict) -> str:
    """Charge the shopper and return the gateway's transaction id."""
    if method == "card":
        return gateway.charge_card(
            required(details, "card_token"), amount_cents
        )
    elif method == "paypal":
        return gateway.charge_paypal(
            required(details, "payer_email"), amount_cents
        )
    elif method == "apple_pay":
        return gateway.charge_wallet(
            "apple_pay", required(details, "wallet_token"), amount_cents
        )
    elif method == "google_pay":
        return gateway.charge_wallet(
            "google_pay", required(details, "wallet_token"), amount_cents
        )
    elif method == "samsung_pay":
        return gateway.charge_wallet(
            "samsung_pay", required(details, "wallet_token"), amount_cents
        )
    elif method == "bank_transfer":
        reference = f"SHOPFRONT-{required(details, 'order_id')}"
        return gateway.expect_transfer(amount_cents, reference)
    elif method == "gift_card":
        return gateway.redeem_gift_card(
            required(details, "code"), amount_cents
        )
    else:
        raise UnsupportedPaymentMethodError(method)


def required(details: dict, name: str) -> str:
    value = details.get(name)
    if value is None:
        raise MissingPaymentDetailError(name)
    return value
