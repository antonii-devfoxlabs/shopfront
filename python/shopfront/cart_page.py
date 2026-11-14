"""What the cart page's buttons call, and its Undo of the last edit."""

from shopfront.cart import Cart
from shopfront.edits import AddLine, ChangeQuantity, EmptyCart, RemoveLine


class NothingToUndoError(Exception):
    pass


class CartPage:
    def __init__(self, cart: Cart) -> None:
        self.cart = cart
        # The message under the buttons, with its Undo link.
        self.message = ""
        self._last: AddLine | ChangeQuantity | RemoveLine | EmptyCart | None
        self._last = None

    def plus(self, sku: str) -> None:
        addition = AddLine(self.cart, sku)
        addition.run()
        self._last = addition
        self.message = f"Added {sku}"

    def minus(self, sku: str) -> None:
        quantity = self.cart.lines.get(sku, 0)
        if quantity == 1:
            removal = RemoveLine(self.cart, sku)
            removal.run()
            self._last = removal
            self.message = f"Removed {sku}"
        else:
            change = ChangeQuantity(self.cart, sku, quantity - 1)
            change.run()
            self._last = change
            self.message = f"{sku} set to {quantity - 1}"

    def set_quantity(self, sku: str, quantity: int) -> None:
        change = ChangeQuantity(self.cart, sku, quantity)
        change.run()
        self._last = change
        if quantity < 1:
            self.message = f"Removed {sku}"
        else:
            self.message = f"{sku} set to {quantity}"

    def remove(self, sku: str) -> None:
        removal = RemoveLine(self.cart, sku)
        removal.run()
        self._last = removal
        self.message = f"Removed {sku}"

    def empty(self) -> None:
        emptying = EmptyCart(self.cart)
        emptying.run()
        self.message = "Emptied the cart"

    def undo(self) -> None:
        if self._last is None:
            raise NothingToUndoError()
        self._last.undo()
        self._last = None
        self.message = ""
