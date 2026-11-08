import pytest

from shopfront.vendor.swiftship import SwiftShip, SwiftShipError


def test_prices_every_started_100_grams():
    # 820 g is nine started 100 g steps.
    assert SwiftShip().quote({"grams": 820, "to": "FR"}) == 630


def test_a_light_parcel_pays_the_minimum():
    assert SwiftShip().quote({"grams": 120, "to": "DE"}) == 390


def test_an_unsupported_country_is_an_error():
    with pytest.raises(SwiftShipError):
        SwiftShip().quote({"grams": 500, "to": "US"})
