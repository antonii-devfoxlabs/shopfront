"""The store's settings, read by every part of Shopfront."""

STORE_NAME = "Shopfront"
STORE_EMAIL = "orders@shopfront.example"
CURRENCY = "EUR"

# Where the store ships from: orders inside this country can ship
# for free.
HOME_COUNTRY = "DE"
FREE_SHIPPING_FROM_CENTS = 5_000

# The accounts Shopfront uses with its providers.
PARCELNOW_ACCOUNT = "shopfront"
MERCHANT_ID = "shopfront-store"
