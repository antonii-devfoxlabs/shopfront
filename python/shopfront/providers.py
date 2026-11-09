"""The edge: every shipping provider's SDK, made to fit ShippingQuote.

This is the only module that calls a shipping provider's SDK. Each
adapter converts Shopfront's question into its SDK's call, the answer
into cents, and the SDK's "we do not ship there" into NoShippingError.
"""

from shopfront.shipping import NoShippingError, ShippingQuote
from shopfront.vendor.boxroute import BoxRouteError, estimate
from shopfront.vendor.parcelnow import ParcelNowClient, ParcelNowError
from shopfront.vendor.swiftship import SwiftShip, SwiftShipError


def parcelnow_quote(client: ParcelNowClient) -> ShippingQuote:
    """ParcelNow's client, made to answer as a ShippingQuote."""

    def cost(grams: int, country: str) -> int:
        try:
            rate = client.get_rate(grams / 1000, country)
        except ParcelNowError as error:
            raise NoShippingError(country) from error
        euros, cents = rate["amount"].split(".")
        return int(euros) * 100 + int(cents)

    return cost


def swiftship_quote(client: SwiftShip) -> ShippingQuote:
    """SwiftShip's client, made to answer as a ShippingQuote."""

    def cost(grams: int, country: str) -> int:
        try:
            return client.quote({"grams": grams, "to": country})
        except SwiftShipError as error:
            raise NoShippingError(country) from error

    return cost


def boxroute_quote(grams: int, country: str) -> int:
    """BoxRoute's estimate, made to answer as a ShippingQuote."""
    try:
        price = estimate(country, grams / 1000)
    except BoxRouteError as error:
        raise NoShippingError(country) from error
    return price["euros"] * 100 + price["cents"]
