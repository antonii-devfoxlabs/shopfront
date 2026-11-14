"""What the cart page's buttons call, and its Undo and Redo links."""

from shopfront.edits import Edit
from shopfront.history import History


class CartPage:
    """Runs whichever edit a button hands it, and keeps it for Undo."""

    def __init__(self) -> None:
        # The message under the buttons, with its Undo and Redo links.
        self.message = ""
        self._history = History()

    def press(self, edit: Edit) -> None:
        self._history.run(edit)
        self.message = edit.label()

    def undo(self) -> None:
        self._history.undo()
        self.message = ""

    def redo(self) -> None:
        edit = self._history.redo()
        self.message = edit.label()
