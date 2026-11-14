"""What the cart page's buttons call, and its Undo of the last edit."""

from shopfront.edits import Edit


class NothingToUndoError(Exception):
    pass


class CartPage:
    """Runs whichever edit a button hands it, and keeps it for Undo."""

    def __init__(self) -> None:
        # The message under the buttons, with its Undo link.
        self.message = ""
        self._last: Edit | None = None

    def press(self, edit: Edit) -> None:
        edit.run()
        self._last = edit
        self.message = edit.label()

    def undo(self) -> None:
        if self._last is None:
            raise NothingToUndoError()
        self._last.undo()
        self._last = None
        self.message = ""
