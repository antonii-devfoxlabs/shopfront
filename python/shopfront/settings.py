"""The settings of each shop Shopfront runs."""

from dataclasses import dataclass


@dataclass(frozen=True, kw_only=True)
class Settings:
    """Everything that makes one shop different from another."""

    store_name: str
    store_email: str
    currency: str
    # Where the shop ships from: orders inside this country can ship
    # for free.
    home_country: str
    free_shipping_from_cents: int
    # The accounts the shop uses with its providers.
    parcelnow_account: str
    merchant_id: str


GERMAN_SHOP = Settings(
    store_name="Shopfront",
    store_email="orders@shopfront.example",
    currency="EUR",
    home_country="DE",
    free_shipping_from_cents=5_000,
    parcelnow_account="shopfront",
    merchant_id="shopfront-store",
)

DUTCH_SHOP = Settings(
    store_name="Shopfront NL",
    store_email="orders.nl@shopfront.example",
    currency="EUR",
    home_country="NL",
    free_shipping_from_cents=6_000,
    parcelnow_account="shopfront-nl",
    merchant_id="shopfront-nl",
)
