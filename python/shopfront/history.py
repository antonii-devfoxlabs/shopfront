"""Every edit the cart page ran, kept in order for Undo and Redo."""

from shopfront.edits import Edit


class NothingToUndoError(Exception):
    pass


class NothingToRedoError(Exception):
    pass


class History:
    """The edits done and undone, newest last in each list."""

    def __init__(self) -> None:
        self._done: list[Edit] = []
        self._undone: list[Edit] = []

    def run(self, edit: Edit) -> None:
        edit.run()
        self._done.append(edit)
        # The undone edits were undone on a cart that has moved on since:
        # let go of them, so Redo cannot run one on the wrong cart.
        self._undone.clear()

    def undo(self) -> None:
        if not self._done:
            raise NothingToUndoError()
        edit = self._done.pop()
        edit.undo()
        self._undone.append(edit)

    def redo(self) -> Edit:
        if not self._undone:
            raise NothingToRedoError()
        edit = self._undone.pop()
        edit.run()
        self._done.append(edit)
        return edit
