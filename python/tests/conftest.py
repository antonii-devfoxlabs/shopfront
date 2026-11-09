import pytest

from shopfront import orders
from shopfront.settings import GERMAN_SHOP
from shopfront.vendor.payment_gateway import PaymentGateway


@pytest.fixture(autouse=True)
def fresh_store():
    """Every test starts with what lives for the whole run made new."""
    orders.reset()


@pytest.fixture
def gateway() -> PaymentGateway:
    """A new payment gateway of the German shop, for one test."""
    return PaymentGateway(merchant=GERMAN_SHOP.merchant_id)
