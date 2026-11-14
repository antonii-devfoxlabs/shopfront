"""What the cart page's buttons call, and its Undo and Redo links."""

from shopfront.edits import Edit


class NothingToUndoError(Exception):
    pass


class NothingToRedoError(Exception):
    pass


class CartPage:
    """Runs whichever edit a button hands it, and keeps it for Undo."""

    def __init__(self) -> None:
        # The message under the buttons, with its Undo and Redo links.
        self.message = ""
        # The edits pressed, newest last: Undo takes the last one.
        self._done: list[Edit] = []
        # The edits undone, newest last: Redo takes the last one.
        self._undone: list[Edit] = []

    def press(self, edit: Edit) -> None:
        edit.run()
        self._done.append(edit)
        self.message = edit.label()

    def undo(self) -> None:
        if not self._done:
            raise NothingToUndoError()
        edit = self._done.pop()
        edit.undo()
        self._undone.append(edit)
        self.message = ""

    def redo(self) -> None:
        if not self._undone:
            raise NothingToRedoError()
        edit = self._undone.pop()
        edit.run()
        self._done.append(edit)
        self.message = edit.label()
