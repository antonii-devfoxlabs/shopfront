"""ParcelNow's SDK: the shipping provider Shopfront uses today."""

import math

_BASE_RATES = {"DE": "4.90", "FR": "8.90", "NL": "7.90", "PL": "9.90"}
_PER_EXTRA_KILO = "1.20"


class ParcelNowError(Exception):
    pass


class ParcelNowClient:
    def __init__(self, account: str) -> None:
        self.account = account

    def get_rate(self, weight_kg: float, destination: str) -> dict:
        """Return the price of one parcel, as ParcelNow's API does:
        a decimal string in euros."""
        if destination not in _BASE_RATES:
            raise ParcelNowError(f"No service to {destination}")
        base_cents = _to_cents(_BASE_RATES[destination])
        extra_kilos = max(0, math.ceil(weight_kg) - 1)
        cents = base_cents + extra_kilos * _to_cents(_PER_EXTRA_KILO)
        return {
            "amount": f"{cents // 100}.{cents % 100:02d}",
            "currency": "EUR",
            "service": "standard",
        }


def _to_cents(amount: str) -> int:
    euros, cents = amount.split(".")
    return int(euros) * 100 + int(cents)
