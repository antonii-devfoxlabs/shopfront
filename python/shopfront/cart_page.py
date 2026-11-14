"""What the cart page's buttons call, and its Undo of the last edit."""

from shopfront.cart import Cart
from shopfront.edits import (
    AddLine,
    ChangeQuantity,
    Edit,
    EmptyCart,
    RemoveLine,
)


class NothingToUndoError(Exception):
    pass


class CartPage:
    def __init__(self, cart: Cart) -> None:
        self.cart = cart
        # The message under the buttons, with its Undo link.
        self.message = ""
        self._last: Edit | None = None

    def plus(self, sku: str) -> None:
        addition = AddLine(self.cart, sku)
        addition.run()
        self._last = addition
        self.message = addition.label()

    def minus(self, sku: str) -> None:
        quantity = self.cart.lines.get(sku, 0)
        if quantity == 1:
            removal = RemoveLine(self.cart, sku)
            removal.run()
            self._last = removal
            self.message = removal.label()
        else:
            change = ChangeQuantity(self.cart, sku, quantity - 1)
            change.run()
            self._last = change
            self.message = change.label()

    def set_quantity(self, sku: str, quantity: int) -> None:
        change = ChangeQuantity(self.cart, sku, quantity)
        change.run()
        self._last = change
        self.message = change.label()

    def remove(self, sku: str) -> None:
        removal = RemoveLine(self.cart, sku)
        removal.run()
        self._last = removal
        self.message = removal.label()

    def empty(self) -> None:
        emptying = EmptyCart(self.cart)
        emptying.run()
        self.message = emptying.label()

    def undo(self) -> None:
        if self._last is None:
            raise NothingToUndoError()
        self._last.undo()
        self._last = None
        self.message = ""
