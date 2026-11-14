"""What a shopper asks the cart page to do, kept so it can be undone."""

from typing import Protocol

from shopfront.cart import Cart


class Edit(Protocol):
    """The slot every cart edit fills, so the page can run any of them."""

    def run(self) -> None: ...

    def undo(self) -> None: ...

    def label(self) -> str: ...


class AddLine:
    """Adds to a line, and can take the addition back."""

    def __init__(self, cart: Cart, sku: str, quantity: int = 1) -> None:
        self._cart = cart
        self._sku = sku
        self._quantity = quantity
        self._before = 0

    def run(self) -> None:
        # Read what the line held before the add: undo needs it.
        self._before = self._cart.lines.get(self._sku, 0)
        self._cart.add(self._sku, self._quantity)

    def undo(self) -> None:
        if self._before == 0:
            self._cart.remove(self._sku)
        else:
            self._cart.change_quantity(self._sku, self._before)

    def label(self) -> str:
        return f"Added {self._sku}"


class ChangeQuantity:
    """Sets a line's quantity, and can set it back."""

    def __init__(self, cart: Cart, sku: str, quantity: int) -> None:
        self._cart = cart
        self._sku = sku
        self._quantity = quantity
        self._before = 0

    def run(self) -> None:
        # Read the quantity before it changes: undo needs it.
        self._before = self._cart.lines.get(self._sku, 0)
        self._cart.change_quantity(self._sku, self._quantity)

    def undo(self) -> None:
        if self._quantity < 1:
            # The change took the line away: add it back.
            self._cart.add(self._sku, self._before)
        else:
            self._cart.change_quantity(self._sku, self._before)

    def label(self) -> str:
        if self._quantity < 1:
            return f"Removed {self._sku}"
        return f"{self._sku} set to {self._quantity}"


class RemoveLine:
    """Takes one line out of the cart, and can put it back."""

    def __init__(self, cart: Cart, sku: str) -> None:
        self._cart = cart
        self._sku = sku
        self._quantity = 0

    def run(self) -> None:
        # Read the quantity before the line goes: undo needs it.
        self._quantity = self._cart.lines.get(self._sku, 0)
        self._cart.remove(self._sku)

    def undo(self) -> None:
        self._cart.add(self._sku, self._quantity)

    def label(self) -> str:
        return f"Removed {self._sku}"


class EmptyCart:
    """Takes every line out of the cart, and can put them all back."""

    def __init__(self, cart: Cart) -> None:
        self._cart = cart
        self._lines: dict[str, int] = {}

    def run(self) -> None:
        # A copy, made before the lines go: undo needs every one.
        self._lines = dict(self._cart.lines)
        for sku in self._lines:
            self._cart.remove(sku)

    def undo(self) -> None:
        for sku, quantity in self._lines.items():
            self._cart.add(sku, quantity)

    def label(self) -> str:
        return "Emptied the cart"


def minus(cart: Cart, sku: str) -> Edit:
    """The minus button's edit: a removal at one, one fewer above it."""
    quantity = cart.lines.get(sku, 0)
    if quantity == 1:
        return RemoveLine(cart, sku)
    return ChangeQuantity(cart, sku, quantity - 1)
