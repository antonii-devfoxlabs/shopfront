"""What a shopper asks the cart page to do, kept so it can be undone."""

from shopfront.cart import Cart


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
