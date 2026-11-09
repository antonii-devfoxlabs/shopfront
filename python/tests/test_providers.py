import pytest

from shopfront.providers import (
    boxroute_quote,
    parcelnow_quote,
    swiftship_quote,
)
from shopfront.settings import GERMAN_SHOP
from shopfront.shipping import NoShippingError
from shopfront.vendor.parcelnow import ParcelNowClient, ParcelNowError
from shopfront.vendor.swiftship import SwiftShip


def test_parcelnows_adapter_answers_in_cents():
    client = ParcelNowClient(account=GERMAN_SHOP.parcelnow_account)
    # 820 g is one started kilo: ParcelNow's "4.90" to Germany.
    cost = parcelnow_quote(client)
    assert cost(820, "DE") == 490


def test_swiftships_adapter_answers_in_cents():
    # 820 g is nine started 100 g steps at 0.60.
    cost = swiftship_quote(SwiftShip())
    assert cost(820, "DE") == 540


def test_boxroutes_adapter_answers_in_cents():
    # 2,500 g is three started kilos: 4.50 and two extra kilos at 1.00.
    assert boxroute_quote(2_500, "PL") == 650


def test_parcelnows_adapter_says_no_in_shopfronts_words():
    client = ParcelNowClient(account=GERMAN_SHOP.parcelnow_account)
    cost = parcelnow_quote(client)
    with pytest.raises(NoShippingError, match="ES") as raised:
        cost(700, "ES")
    # ParcelNow's own error stays attached, for whoever debugs it.
    assert isinstance(raised.value.__cause__, ParcelNowError)


def test_swiftships_adapter_says_no_in_shopfronts_words():
    cost = swiftship_quote(SwiftShip())
    with pytest.raises(NoShippingError, match="ES"):
        cost(700, "ES")


def test_boxroutes_adapter_says_no_in_shopfronts_words():
    with pytest.raises(NoShippingError, match="ES"):
        boxroute_quote(700, "ES")
