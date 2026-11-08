import pytest

from shopfront import settings
from shopfront.cart import Cart
from shopfront.catalog import starter_catalog
from shopfront.shipping import cart_weight_grams, shipping_cost
from shopfront.vendor.parcelnow import ParcelNowError


def cart_of(sku: str, quantity: int) -> Cart:
    cart = Cart()
    cart.add(sku, quantity)
    return cart


def test_weight_adds_every_line():
    assert cart_weight_grams(cart_of("MUG-01", 2), starter_catalog()) == 700


def test_home_orders_over_the_threshold_ship_free():
    cart = cart_of("KTL-03", 2)
    assert shipping_cost(cart, starter_catalog(), "DE", 9_800) == 0


def test_home_orders_under_the_threshold_pay_parcelnow():
    cart = cart_of("MUG-01", 1)
    assert shipping_cost(cart, starter_catalog(), "DE", 1_250) == 490


def test_exactly_the_threshold_ships_free():
    cart = cart_of("MUG-01", 4)
    assert shipping_cost(cart, starter_catalog(), "DE", 5_000) == 0


def test_heavy_home_parcels_still_go_by_parcelnow():
    cart = cart_of("KTL-03", 5)
    # 5.5 kg: the base rate and five extra kilos.
    assert shipping_cost(cart, starter_catalog(), "DE", 4_000) == 1_090


def test_exactly_five_kilos_abroad_is_not_freight():
    cart = cart_of("FLT-05", 50)
    # 4.5 kg: the base rate and four extra kilos.
    assert shipping_cost(cart, starter_catalog(), "NL", 22_500) == 1_270
    heavier = cart_of("CUP-04", 9)
    # 5.4 kg is over five kilos, so it goes as freight.
    assert shipping_cost(heavier, starter_catalog(), "NL", 21_600) == 3_500


def test_an_empty_cart_pays_the_base_rate():
    assert shipping_cost(Cart(), starter_catalog(), "FR", 0) == 890


def test_the_threshold_comes_from_the_settings(monkeypatch):
    monkeypatch.setattr(settings, "FREE_SHIPPING_FROM_CENTS", 1_000)
    cart = cart_of("MUG-01", 1)
    assert shipping_cost(cart, starter_catalog(), "DE", 1_250) == 0


def test_abroad_pays_even_over_the_threshold():
    cart = cart_of("KTL-03", 2)
    # 2.2 kg: the base rate and two extra kilos.
    assert shipping_cost(cart, starter_catalog(), "FR", 9_800) == 1_130


def test_heavy_parcels_abroad_go_as_freight():
    cart = cart_of("KTL-03", 5)
    assert shipping_cost(cart, starter_catalog(), "NL", 24_500) == 3_500


def test_parcelnow_does_not_ship_everywhere():
    with pytest.raises(ParcelNowError):
        shipping_cost(cart_of("MUG-01", 1), starter_catalog(), "US", 1_250)
