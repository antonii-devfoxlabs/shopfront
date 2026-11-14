"""The wholesaler's SDK: the products it sells, a hundred per request.

A real one answers over the network, so every request takes a moment;
this one waits 10 ms to show it, and `requests` counts them. It keeps
its products in SKU order and answers the hundred after the SKU it is
given, so a caller can start anywhere.
"""

import asyncio
from bisect import bisect_right

PAGE_SIZE = 100
_ANSWER_SECONDS = 0.01
_KINDS = (
    ("Enamel mug", 1_250, 350, 40),
    ("Green tea, 100 g", 890, 120, 120),
    ("Pour-over kettle", 4_900, 1_100, 8),
    ("Glass cup, set of two", 2_400, 600, 25),
    ("Paper filters, 100", 450, 90, 200),
)


class Wholesaler:
    def __init__(self, count: int) -> None:
        self.requests = 0
        self._rows = [_row(number) for number in range(1, count + 1)]
        self._skus = [row["sku"] for row in self._rows]

    async def products_after(self, sku: str | None) -> list[dict]:
        """The next hundred products after `sku`, or the first hundred
        without one: fewer at the end, none after the last."""
        self.requests += 1
        await asyncio.sleep(_ANSWER_SECONDS)
        start = 0 if sku is None else bisect_right(self._skus, sku)
        return [dict(row) for row in self._rows[start : start + PAGE_SIZE]]

    def stop_selling(self, sku: str) -> None:
        """The wholesaler takes a product out of its range."""
        place = self._skus.index(sku)
        del self._rows[place]
        del self._skus[place]


def _row(number: int) -> dict:
    name, price_cents, weight_grams, stock = _KINDS[(number - 1) % 5]
    return {
        "sku": f"W-{number:05d}",
        "name": name,
        "price_cents": price_cents,
        "weight_grams": weight_grams,
        "stock": stock,
    }
