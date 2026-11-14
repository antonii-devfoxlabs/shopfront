"""The wholesaler's range on the shop's pages, twenty to a page."""

from shopfront.catalog import Product
from shopfront.cursors import take
from shopfront.vendor.wholesaler import Wholesaler


class WholesaleCatalog:
    """The products the wholesaler sells, as the shop shows them."""

    def __init__(self, wholesaler: Wholesaler) -> None:
        self._wholesaler = wholesaler

    async def all_products(self) -> list[Product]:
        """Every product the wholesaler sells, a hundred per request."""
        products: list[Product] = []
        rows = await self._wholesaler.products_after(None)
        while rows:
            products.extend(Product(**row) for row in rows)
            rows = await self._wholesaler.products_after(rows[-1]["sku"])
        return products

    async def page(
        self, size: int, after: str | None = None
    ) -> list[Product]:
        """The `size` products after the SKU `after`, the last one the
        shopper saw (the More link carries it), or the first page."""
        cursor = iter(await self.all_products())
        if after is not None:
            for product in cursor:
                if product.sku == after:
                    break
        return take(cursor, size)
