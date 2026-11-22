"""What the warehouse puts into the parcel of an order."""

from shopfront.orders import Order

SAMPLE = "TEA-SAMPLE"
SAMPLE_FROM_CENTS = 4_000


def packing_slip(order: Order) -> list[str]:
    """What goes into the parcel, one line per product, in SKU order: the
    order the shelves are in, so the warehouse walks them once."""
    slip = [
        f"{quantity} x {sku}" for sku, quantity in sorted(order.lines.items())
    ]
    if order.total_cents >= SAMPLE_FROM_CENTS:
        slip.append(f"1 x {SAMPLE}")
    return slip
