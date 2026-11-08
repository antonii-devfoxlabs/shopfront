"""A shopper's cart: which products, and how many of each."""


class NotInCartError(Exception):
    pass


class Cart:
    def __init__(self) -> None:
        self.lines: dict[str, int] = {}

    def add(self, sku: str, quantity: int = 1) -> None:
        if quantity < 1:
            raise ValueError("Add at least one")
        self.lines[sku] = self.lines.get(sku, 0) + quantity

    def change_quantity(self, sku: str, quantity: int) -> None:
        if sku not in self.lines:
            raise NotInCartError(sku)
        if quantity < 1:
            del self.lines[sku]
        else:
            self.lines[sku] = quantity

    def remove(self, sku: str) -> None:
        if sku not in self.lines:
            raise NotInCartError(sku)
        del self.lines[sku]

    def is_empty(self) -> bool:
        return not self.lines
