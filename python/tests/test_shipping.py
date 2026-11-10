import copy
from datetime import date

import pytest

from shopfront.cart import Cart
from shopfront.catalog import starter_catalog
from shopfront.providers import (
    boxroute_quote,
    parcelnow_quote,
    swiftship_quote,
)
from shopfront.settings import DUTCH_SHOP, GERMAN_SHOP, Settings
from shopfront.shipping import (
    Cheapest,
    Flat,
    FreeFriday,
    NoShippingError,
    Shipping,
    ShippingOffer,
    ShippingQuote,
    cart_weight_grams,
)
from shopfront.vendor.parcelnow import ParcelNowClient
from shopfront.vendor.swiftship import SwiftShip

A_WEDNESDAY = date(2026, 7, 15)
A_FRIDAY = date(2026, 7, 17)


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


class NoOffer:
    """A stand-in offer for the tests about everything else: it never
    lets an order ship free."""

    def ships_free(self, paid_cents: int) -> bool:
        return False


def shipping_for(shop: Settings, offer: ShippingOffer) -> Shipping:
    """The shop's shipping, with the shop's providers and the offer the
    test hands in."""
    return Shipping(offer=offer, providers=providers_for(shop), shop=shop)


def test_weight_adds_every_line():
    assert cart_weight_grams(cart_of("MUG-01", 2), starter_catalog()) == 700


def test_home_orders_over_the_threshold_ship_free():
    cart = cart_of("KTL-03", 2)
    assert (
        shipping_for(GERMAN_SHOP, NoOffer()).cost(
            cart, starter_catalog(), "DE", 9_800
        )
        == 0
    )


def test_home_orders_under_the_threshold_pay_the_cheaper_provider():
    cart = cart_of("MUG-01", 1)
    # 350 g: SwiftShip's minimum, 3.90, beats ParcelNow's 4.90.
    assert (
        shipping_for(GERMAN_SHOP, NoOffer()).cost(
            cart, starter_catalog(), "DE", 1_250
        )
        == 390
    )


def test_exactly_the_threshold_ships_free():
    cart = cart_of("MUG-01", 4)
    assert (
        shipping_for(GERMAN_SHOP, NoOffer()).cost(
            cart, starter_catalog(), "DE", 5_000
        )
        == 0
    )


def test_heavy_home_parcels_still_go_by_parcelnow():
    cart = cart_of("KTL-03", 5)
    # 5.5 kg: the base rate and five extra kilos.
    assert (
        shipping_for(GERMAN_SHOP, NoOffer()).cost(
            cart, starter_catalog(), "DE", 4_000
        )
        == 1_090
    )


def test_exactly_five_kilos_abroad_is_not_freight():
    cart = cart_of("FLT-05", 50)
    # 4.5 kg: the base rate and four extra kilos.
    assert (
        shipping_for(GERMAN_SHOP, NoOffer()).cost(
            cart, starter_catalog(), "NL", 22_500
        )
        == 1_270
    )
    heavier = cart_of("CUP-04", 9)
    # 5.4 kg is over five kilos, so it goes as freight.
    assert (
        shipping_for(GERMAN_SHOP, NoOffer()).cost(
            heavier, starter_catalog(), "NL", 21_600
        )
        == 3_500
    )


def test_an_empty_cart_pays_swiftships_minimum():
    assert (
        shipping_for(GERMAN_SHOP, NoOffer()).cost(
            Cart(), starter_catalog(), "FR", 0
        )
        == 390
    )


def test_a_light_parcel_abroad_goes_by_swiftship():
    cart = cart_of("MUG-01", 2)
    # 700 g to France: SwiftShip 4.90, ParcelNow 8.90.
    assert (
        shipping_for(GERMAN_SHOP, NoOffer()).cost(
            cart, starter_catalog(), "FR", 2_500
        )
        == 490
    )


def test_a_parcel_to_poland_goes_by_boxroute():
    cart = cart_of("MUG-01", 2)
    # 700 g to Poland: BoxRoute 4.50, SwiftShip 5.25, ParcelNow 9.90.
    assert (
        shipping_for(GERMAN_SHOP, NoOffer()).cost(
            cart, starter_catalog(), "PL", 2_500
        )
        == 450
    )


def test_a_parcel_to_austria_goes_by_swiftship():
    cart = cart_of("MUG-01", 2)
    # 700 g to Austria: only SwiftShip ships there, 7 x 0.80.
    assert (
        shipping_for(GERMAN_SHOP, NoOffer()).cost(
            cart, starter_catalog(), "AT", 2_500
        )
        == 560
    )


def test_the_threshold_comes_from_the_settings():
    lower = copy.replace(GERMAN_SHOP, free_shipping_from_cents=1_000)
    cart = cart_of("MUG-01", 1)
    assert (
        shipping_for(lower, NoOffer()).cost(
            cart, starter_catalog(), "DE", 1_250
        )
        == 0
    )


def test_the_dutch_shop_ships_free_at_home_from_60_eur():
    cart = cart_of("MUG-01", 5)
    assert (
        shipping_for(DUTCH_SHOP, NoOffer()).cost(
            cart, starter_catalog(), "NL", 6_000
        )
        == 0
    )
    assert (
        shipping_for(DUTCH_SHOP, NoOffer()).cost(
            cart, starter_catalog(), "NL", 5_999
        )
        == 910
    )
    # For the Dutch shop, Germany is abroad.
    assert (
        shipping_for(DUTCH_SHOP, NoOffer()).cost(
            cart, starter_catalog(), "DE", 9_800
        )
        == 610
    )


def test_abroad_pays_even_over_the_threshold():
    cart = cart_of("KTL-03", 2)
    # 2.2 kg: the base rate and two extra kilos.
    assert (
        shipping_for(GERMAN_SHOP, NoOffer()).cost(
            cart, starter_catalog(), "FR", 9_800
        )
        == 1_130
    )


def test_heavy_parcels_abroad_go_as_freight():
    cart = cart_of("KTL-03", 5)
    assert (
        shipping_for(GERMAN_SHOP, NoOffer()).cost(
            cart, starter_catalog(), "NL", 24_500
        )
        == 3_500
    )


def test_on_fridays_home_orders_from_40_eur_ship_free():
    cart = cart_of("MUG-01", 4)
    line = GERMAN_SHOP.free_friday_from_cents
    on_friday = FreeFriday(line, today=lambda: A_FRIDAY)
    on_wednesday = FreeFriday(line, today=lambda: A_WEDNESDAY)
    assert (
        shipping_for(GERMAN_SHOP, on_friday).cost(
            cart, starter_catalog(), "DE", 4_000
        )
        == 0
    )
    # The same order on a Wednesday pays the cheapest provider.
    assert (
        shipping_for(GERMAN_SHOP, on_wednesday).cost(
            cart, starter_catalog(), "DE", 4_000
        )
        == 610
    )


def test_the_dutch_free_friday_starts_at_50_eur():
    cart = cart_of("MUG-01", 5)
    on_friday = FreeFriday(
        DUTCH_SHOP.free_friday_from_cents, today=lambda: A_FRIDAY
    )
    dutch = shipping_for(DUTCH_SHOP, on_friday)
    assert dutch.cost(cart, starter_catalog(), "NL", 5_000) == 0
    # 45.00 EUR is over the German Friday line, not the Dutch one.
    assert dutch.cost(cart, starter_catalog(), "NL", 4_500) == 910


def test_an_offer_frees_only_orders_at_home():
    class Always:
        """A stand-in offer that lets every order ship free."""

        def ships_free(self, paid_cents: int) -> bool:
            return True

    german = shipping_for(GERMAN_SHOP, Always())
    cart = cart_of("MUG-01", 2)
    assert german.cost(cart, starter_catalog(), "DE", 2_500) == 0
    assert german.cost(cart, starter_catalog(), "FR", 2_500) == 490


def test_switzerland_pays_a_flat_price():
    cart = cart_of("MUG-01", 2)
    # No provider ships to Switzerland; a courier takes it for 9.90.
    assert (
        shipping_for(GERMAN_SHOP, NoOffer()).cost(
            cart, starter_catalog(), "CH", 2_500
        )
        == 990
    )


def test_a_heavy_parcel_to_switzerland_pays_the_flat_price_too():
    cart = cart_of("KTL-03", 6)
    # 6.6 kg: heavy, but Switzerland's rule is one price for every parcel.
    assert (
        shipping_for(GERMAN_SHOP, NoOffer()).cost(
            cart, starter_catalog(), "CH", 29_400
        )
        == 990
    )


def test_nobody_ships_to_spain():
    with pytest.raises(NoShippingError, match="ES"):
        shipping_for(GERMAN_SHOP, NoOffer()).cost(
            cart_of("MUG-01", 1), starter_catalog(), "ES", 1_250
        )


def test_a_flat_rule_charges_every_parcel_the_same():
    swiss = Flat(990)
    assert swiss.cost(350, "CH") == 990
    assert swiss.cost(6_600, "CH") == 990


def test_the_cheapest_rule_says_no_when_nobody_ships_there():
    def nowhere(grams: int, country: str) -> int:
        raise NoShippingError(country)

    with pytest.raises(NoShippingError, match="ES"):
        Cheapest([nowhere]).cost(350, "ES")


def test_free_friday_ships_free_on_fridays_from_its_line():
    offer = FreeFriday(4_000, today=lambda: A_FRIDAY)
    assert offer.ships_free(4_000)
    assert not offer.ships_free(3_999)


def test_free_friday_reads_its_clock_every_time():
    today = A_WEDNESDAY
    offer = FreeFriday(4_000, today=lambda: today)
    assert not offer.ships_free(4_000)
    today = A_FRIDAY
    assert offer.ships_free(4_000)


def test_the_cheapest_provider_wins():
    # Two stand-in providers, each with one price for every parcel.
    cheapest = Cheapest(
        [lambda grams, country: 700, lambda grams, country: 450]
    )
    assert cheapest.cost(350, "FR") == 450


def test_a_provider_that_does_not_ship_there_is_skipped():
    def nowhere(grams: int, country: str) -> int:
        raise NoShippingError(country)

    assert (
        Cheapest([nowhere, lambda grams, country: 700]).cost(350, "FR") == 700
    )


def test_the_shipping_cost_logs_nothing_itself(
    capsys: pytest.CaptureFixture[str],
):
    # main decides what is timed and where its log goes.
    shipping_for(GERMAN_SHOP, NoOffer()).cost(
        cart_of("MUG-01", 2), starter_catalog(), "FR", 2_000
    )
    assert capsys.readouterr().out == ""
