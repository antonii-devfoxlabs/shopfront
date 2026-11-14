"""A shopper's cart: which products, and how many of each."""


class NotInCartError(Exception):
    pass


class NothingToUndoError(Exception):
    pass


class Cart:
    def __init__(self) -> None:
        self.lines: dict[str, int] = {}
        # The line the last removal took away, for the cart page's Undo.
        self.removed: tuple[str, int] | None = None

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
        self.removed = (sku, self.lines.pop(sku))

    def undo_remove(self) -> None:
        """Put back the line the last removal took away."""
        if self.removed is None:
            raise NothingToUndoError()
        sku, quantity = self.removed
        self.removed = None
        self.add(sku, quantity)

    def is_empty(self) -> bool:
        return not self.lines
