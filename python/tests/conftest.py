import pytest

from shopfront import orders, payments


@pytest.fixture(autouse=True)
def fresh_store():
    """Every test starts with what lives for the whole run made new."""
    orders.reset()
    payments.reset()
