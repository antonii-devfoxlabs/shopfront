"""What the cart page's buttons call, and its Undo and Redo links."""

from shopfront.cart import Cart
from shopfront.edits import (
    AddLine,
    ChangeQuantity,
    Edit,
    EmptyCart,
    RemoveLine,
)
from shopfront.history import History


class CartPage:
    """Runs whichever edit a button hands it, and keeps it for Undo."""

    def __init__(self) -> None:
        # The message under the buttons, with its Undo and Redo links.
        self.message = ""
        # Every press, Undo and Redo, in order: replayed after a restart,
        # they rebuild the cart.
        self.log: list[str] = []
        self._history = History()

    def press(self, edit: Edit) -> None:
        self._history.run(edit)
        self.log.append(edit.label())
        self.message = edit.label()

    def undo(self) -> None:
        self._history.undo()
        self.log.append("Undo")
        self.message = ""

    def redo(self) -> None:
        edit = self._history.redo()
        self.log.append("Redo")
        self.message = edit.label()


def restore(cart: Cart, log: list[str]) -> CartPage:
    """The page after a restart: the log replayed on a new cart."""
    page = CartPage()
    for line in log:
        if line == "Undo":
            page.undo()
        elif line == "Redo":
            page.redo()
        else:
            page.press(_edit_from_label(cart, line))
    return page


def _edit_from_label(cart: Cart, label: str) -> Edit:
    # A label is all an edit can say about itself: read the edit back
    # from its words.
    if label == "Emptied the cart":
        return EmptyCart(cart)
    if label.startswith("Added "):
        return AddLine(cart, label.removeprefix("Added "))
    if label.startswith("Removed "):
        return RemoveLine(cart, label.removeprefix("Removed "))
    sku, quantity = label.split(" set to ")
    return ChangeQuantity(cart, sku, int(quantity))
