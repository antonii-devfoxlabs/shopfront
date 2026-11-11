"""The products Shopfront sells, and how many of each are left."""

from collections.abc import Mapping, Sequence
from dataclasses import dataclass


@dataclass
class Product:
    sku: str
    name: str
    price_cents: int
    weight_grams: int
    stock: int


class UnknownProductError(Exception):
    pass


class OutOfStockError(Exception):
    pass


class ProductCursor:
    """Hands over the catalog's products one at a time, in order. It
    keeps its own place, so each walk has a cursor of its own."""

    def __init__(self, products: Sequence[Product]) -> None:
        self._products = products
        self._place = 0

    def next(self) -> Product | None:
        """The next product, or None once every one is handed over."""
        if self._place == len(self._products):
            return None
        product = self._products[self._place]
        self._place += 1
        return product


class Catalog:
    def __init__(self, products: list[Product]) -> None:
        self._products = list(products)
        self._by_sku = {product.sku: product for product in products}

    def all_products(self) -> list[Product]:
        return list(self._products)

    def cursor(self) -> ProductCursor:
        """A new walk over every product, from the first."""
        return ProductCursor(self._products)

    def page(self, number: int, size: int) -> list[Product]:
        """The products on page `number`, counted from 1."""
        start = (number - 1) * size
        return self.all_products()[start : start + size]

    def find(self, sku: str) -> Product:
        try:
            return self._by_sku[sku]
        except KeyError:
            raise UnknownProductError(sku) from None

    def take_from_stock(self, sku: str, quantity: int) -> None:
        product = self.find(sku)
        if product.stock < quantity:
            raise OutOfStockError(
                f"{sku}: {quantity} wanted, {product.stock} left"
            )
        product.stock -= quantity

    def check_stock(self, lines: Mapping[str, int]) -> None:
        """Raise if any line is short; take nothing."""
        for sku, quantity in lines.items():
            product = self.find(sku)
            if product.stock < quantity:
                raise OutOfStockError(
                    f"{sku}: {quantity} wanted, {product.stock} left"
                )

    def take_all_from_stock(self, lines: Mapping[str, int]) -> None:
        """Take every line, or none of them if one is short."""
        self.check_stock(lines)
        for sku, quantity in lines.items():
            self.take_from_stock(sku, quantity)

    def search(self, text: str, limit: int) -> list[Product]:
        """The first `limit` products whose names hold `text`, any case."""
        wanted = text.lower()
        found = [
            product
            for product in self.all_products()
            if wanted in product.name.lower()
        ]
        return found[:limit]


def starter_catalog() -> Catalog:
    return Catalog(
        [
            Product("MUG-01", "Enamel mug", 1_250, 350, 40),
            Product("TEA-02", "Green tea, 100 g", 890, 120, 120),
            Product("KTL-03", "Pour-over kettle", 4_900, 1_100, 8),
            Product("CUP-04", "Glass cup, set of two", 2_400, 600, 25),
            Product("FLT-05", "Paper filters, 100", 450, 90, 200),
        ]
    )
