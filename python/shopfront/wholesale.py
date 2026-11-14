"""The wholesaler's range on the shop's pages, twenty to a page."""

from collections.abc import AsyncIterator

from shopfront.catalog import Product
from shopfront.cursors import take_async
from shopfront.vendor.wholesaler import Wholesaler


class WholesaleCatalog:
    """The products the wholesaler sells, as the shop shows them."""

    def __init__(self, wholesaler: Wholesaler) -> None:
        self._wholesaler = wholesaler

    async def cursor(
        self, after: str | None = None
    ) -> AsyncIterator[Product]:
        """A new walk over the wholesaler's products after the SKU `after`,
        or from the first without one. It asks for the next hundred only
        once it has handed over the last."""
        rows = await self._wholesaler.products_after(after)
        while rows:
            for row in rows:
                yield Product(**row)
            rows = await self._wholesaler.products_after(rows[-1]["sku"])

    def __aiter__(self) -> AsyncIterator[Product]:
        """What an async for loop asks for: a new cursor, from the first."""
        return self.cursor()

    async def page(
        self, size: int, after: str | None = None
    ) -> list[Product]:
        """The `size` products after the SKU `after`, the last one the
        shopper saw (the More link carries it), or the first page."""
        return await take_async(self.cursor(after), size)
