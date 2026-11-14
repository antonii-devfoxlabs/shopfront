"""What a shopper asks the cart page to do, kept so it can be undone."""

from shopfront.cart import Cart


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
