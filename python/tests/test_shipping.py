import copy

import pytest

from shopfront.cart import Cart
from shopfront.catalog import starter_catalog
from shopfront.settings import DUTCH_SHOP, GERMAN_SHOP, Settings
from shopfront.shipping import (
    NoShippingError,
    ShippingQuote,
    boxroute_quote,
    cart_weight_grams,
    parcelnow_quote,
    shipping_cost,
    swiftship_quote,
)
from shopfront.vendor.parcelnow import ParcelNowClient
from shopfront.vendor.swiftship import SwiftShip, SwiftShipError


def cart_of(sku: str, quantity: int) -> Cart:
    cart = Cart()
    cart.add(sku, quantity)
    return cart


def providers_for(shop: Settings) -> list[ShippingQuote]:
    """Every shipping provider, with the shop's ParcelNow account."""
    return [
        parcelnow_quote(ParcelNowClient(account=shop.parcelnow_account)),
        swiftship_quote(SwiftShip()),
        boxroute_quote,
    ]


def test_weight_adds_every_line():
    assert cart_weight_grams(cart_of("MUG-01", 2), starter_catalog()) == 700


def test_home_orders_over_the_threshold_ship_free():
    cart = cart_of("KTL-03", 2)
    assert (
        shipping_cost(
            cart,
            starter_catalog(),
            "DE",
            9_800,
            providers_for(GERMAN_SHOP),
            GERMAN_SHOP,
        )
        == 0
    )


def test_home_orders_under_the_threshold_pay_the_cheaper_provider():
    cart = cart_of("MUG-01", 1)
    # 350 g: SwiftShip's minimum, 3.90, beats ParcelNow's 4.90.
    assert (
        shipping_cost(
            cart,
            starter_catalog(),
            "DE",
            1_250,
            providers_for(GERMAN_SHOP),
            GERMAN_SHOP,
        )
        == 390
    )


def test_exactly_the_threshold_ships_free():
    cart = cart_of("MUG-01", 4)
    assert (
        shipping_cost(
            cart,
            starter_catalog(),
            "DE",
            5_000,
            providers_for(GERMAN_SHOP),
            GERMAN_SHOP,
        )
        == 0
    )


def test_heavy_home_parcels_still_go_by_parcelnow():
    cart = cart_of("KTL-03", 5)
    # 5.5 kg: the base rate and five extra kilos.
    assert (
        shipping_cost(
            cart,
            starter_catalog(),
            "DE",
            4_000,
            providers_for(GERMAN_SHOP),
            GERMAN_SHOP,
        )
        == 1_090
    )


def test_exactly_five_kilos_abroad_is_not_freight():
    cart = cart_of("FLT-05", 50)
    # 4.5 kg: the base rate and four extra kilos.
    assert (
        shipping_cost(
            cart,
            starter_catalog(),
            "NL",
            22_500,
            providers_for(GERMAN_SHOP),
            GERMAN_SHOP,
        )
        == 1_270
    )
    heavier = cart_of("CUP-04", 9)
    # 5.4 kg is over five kilos, so it goes as freight.
    assert (
        shipping_cost(
            heavier,
            starter_catalog(),
            "NL",
            21_600,
            providers_for(GERMAN_SHOP),
            GERMAN_SHOP,
        )
        == 3_500
    )


def test_an_empty_cart_pays_swiftships_minimum():
    assert (
        shipping_cost(
            Cart(),
            starter_catalog(),
            "FR",
            0,
            providers_for(GERMAN_SHOP),
            GERMAN_SHOP,
        )
        == 390
    )


def test_a_light_parcel_abroad_goes_by_swiftship():
    cart = cart_of("MUG-01", 2)
    # 700 g to France: SwiftShip 4.90, ParcelNow 8.90.
    assert (
        shipping_cost(
            cart,
            starter_catalog(),
            "FR",
            2_500,
            providers_for(GERMAN_SHOP),
            GERMAN_SHOP,
        )
        == 490
    )


def test_a_parcel_to_poland_goes_by_boxroute():
    cart = cart_of("MUG-01", 2)
    # 700 g to Poland: BoxRoute 4.50, SwiftShip 5.25, ParcelNow 9.90.
    assert (
        shipping_cost(
            cart,
            starter_catalog(),
            "PL",
            2_500,
            providers_for(GERMAN_SHOP),
            GERMAN_SHOP,
        )
        == 450
    )


def test_a_parcel_to_austria_goes_by_swiftship():
    cart = cart_of("MUG-01", 2)
    # 700 g to Austria: only SwiftShip ships there, 7 x 0.80.
    assert (
        shipping_cost(
            cart,
            starter_catalog(),
            "AT",
            2_500,
            providers_for(GERMAN_SHOP),
            GERMAN_SHOP,
        )
        == 560
    )


def test_the_threshold_comes_from_the_settings():
    lower = copy.replace(GERMAN_SHOP, free_shipping_from_cents=1_000)
    cart = cart_of("MUG-01", 1)
    assert (
        shipping_cost(
            cart, starter_catalog(), "DE", 1_250, providers_for(lower), lower
        )
        == 0
    )


def test_the_dutch_shop_ships_free_at_home_from_60_eur():
    cart = cart_of("MUG-01", 5)
    assert (
        shipping_cost(
            cart,
            starter_catalog(),
            "NL",
            6_000,
            providers_for(DUTCH_SHOP),
            DUTCH_SHOP,
        )
        == 0
    )
    assert (
        shipping_cost(
            cart,
            starter_catalog(),
            "NL",
            5_999,
            providers_for(DUTCH_SHOP),
            DUTCH_SHOP,
        )
        == 910
    )
    # For the Dutch shop, Germany is abroad.
    assert (
        shipping_cost(
            cart,
            starter_catalog(),
            "DE",
            9_800,
            providers_for(DUTCH_SHOP),
            DUTCH_SHOP,
        )
        == 610
    )


def test_abroad_pays_even_over_the_threshold():
    cart = cart_of("KTL-03", 2)
    # 2.2 kg: the base rate and two extra kilos.
    assert (
        shipping_cost(
            cart,
            starter_catalog(),
            "FR",
            9_800,
            providers_for(GERMAN_SHOP),
            GERMAN_SHOP,
        )
        == 1_130
    )


def test_heavy_parcels_abroad_go_as_freight():
    cart = cart_of("KTL-03", 5)
    assert (
        shipping_cost(
            cart,
            starter_catalog(),
            "NL",
            24_500,
            providers_for(GERMAN_SHOP),
            GERMAN_SHOP,
        )
        == 3_500
    )


def test_nobody_ships_to_spain():
    with pytest.raises(NoShippingError, match="ES"):
        shipping_cost(
            cart_of("MUG-01", 1),
            starter_catalog(),
            "ES",
            1_250,
            providers_for(GERMAN_SHOP),
            GERMAN_SHOP,
        )


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


def test_the_cheapest_provider_wins():
    # Two stand-in providers, each with one price for every parcel.
    providers: list[ShippingQuote] = [
        lambda grams, country: 700,
        lambda grams, country: 450,
    ]
    cart = cart_of("MUG-01", 1)
    assert (
        shipping_cost(
            cart, starter_catalog(), "FR", 1_250, providers, GERMAN_SHOP
        )
        == 450
    )


def test_a_provider_that_does_not_ship_there_is_skipped():
    def nowhere(grams: int, country: str) -> int:
        raise SwiftShipError(f"Unsupported country: {country}")

    providers: list[ShippingQuote] = [nowhere, lambda grams, country: 700]
    cart = cart_of("MUG-01", 1)
    assert (
        shipping_cost(
            cart, starter_catalog(), "FR", 1_250, providers, GERMAN_SHOP
        )
        == 700
    )
