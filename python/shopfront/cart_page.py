"""What the cart page's buttons call, and its Undo and Redo links."""

from functools import partial

from shopfront.cart import Cart
from shopfront.edits import Edit, apply, label, read, write
from shopfront.history import History


class CartPage:
    """Runs whichever edit a button hands it, and keeps it for Undo."""

    def __init__(self, cart: Cart) -> None:
        # The message under the buttons, with its Undo and Redo links.
        self.message = ""
        # Every press, Undo and Redo, in order: replayed after a restart,
        # they rebuild the cart.
        self.log: list[str] = []
        self._history: History[Edit] = History(partial(apply, cart))

    def press(self, edit: Edit) -> None:
        self._history.run(edit)
        self.log.append(write(edit))
        self.message = label(edit)

    def undo(self) -> None:
        self._history.undo()
        self.log.append("Undo")
        self.message = ""

    def redo(self) -> None:
        edit = self._history.redo()
        self.log.append("Redo")
        self.message = label(edit)


def restore(cart: Cart, log: list[str]) -> CartPage:
    """The page after a restart: the log replayed on a new cart."""
    page = CartPage(cart)
    for line in log:
        if line == "Undo":
            page.undo()
        elif line == "Redo":
            page.redo()
        else:
            page.press(read(line))
    return page
