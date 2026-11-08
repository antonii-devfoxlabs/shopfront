"""The products Shopfront sells, and how many of each are left."""

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


class Catalog:
    def __init__(self, products: list[Product]) -> None:
        self._products = {product.sku: product for product in products}

    def all_products(self) -> list[Product]:
        return list(self._products.values())

    def find(self, sku: str) -> Product:
        try:
            return self._products[sku]
        except KeyError:
            raise UnknownProductError(sku) from None

    def take_from_stock(self, sku: str, quantity: int) -> None:
        product = self.find(sku)
        if product.stock < quantity:
            raise OutOfStockError(
                f"{sku}: {quantity} wanted, {product.stock} left"
            )
        product.stock -= quantity

    def take_all_from_stock(self, lines: dict[str, int]) -> None:
        """Take every line, or none of them if one is short."""
        for sku, quantity in lines.items():
            product = self.find(sku)
            if product.stock < quantity:
                raise OutOfStockError(
                    f"{sku}: {quantity} wanted, {product.stock} left"
                )
        for sku, quantity in lines.items():
            self.take_from_stock(sku, quantity)

    def search(self, text: str) -> list[Product]:
        wanted = text.lower()
        return [
            product
            for product in self.all_products()
            if wanted in product.name.lower()
        ]


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
