"""The parcels the warehouse hands to couriers, and who carries them."""

from dataclasses import dataclass


@dataclass(frozen=True, kw_only=True)
class Courier:
    """A courier the warehouse hands parcels to."""

    name: str
    # The courier's tracking page: a parcel's number goes at its end.
    tracking_page: str


@dataclass(frozen=True, kw_only=True)
class Parcel:
    """What the warehouse handed a courier for one order."""

    courier: Courier
    # The courier's own number for the parcel.
    number: str


PARCELNOW = Courier(
    name="ParcelNow", tracking_page="https://parcelnow.example/track/"
)
SWIFTSHIP = Courier(
    name="SwiftShip", tracking_page="https://swiftship.example/t/"
)
