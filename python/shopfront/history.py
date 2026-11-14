"""Every edit the cart page ran, kept in order for Undo and Redo."""

from collections.abc import Callable

# What takes one edit back: a function that needs nothing more.
type Undo = Callable[[], None]


class NothingToUndoError(Exception):
    pass


class NothingToRedoError(Exception):
    pass


class History[E]:
    """The edits done and undone, newest last in each list."""

    def __init__(self, apply: Callable[[E], Undo]) -> None:
        # Runs an edit, and answers what takes it back.
        self._apply = apply
        # Each edit done, with what takes it back.
        self._done: list[tuple[E, Undo]] = []
        self._undone: list[E] = []

    def run(self, edit: E) -> None:
        self._done.append((edit, self._apply(edit)))
        # The undone edits were undone on a cart that has moved on since:
        # let go of them, so Redo cannot run one on the wrong cart.
        self._undone.clear()

    def undo(self) -> None:
        if not self._done:
            raise NothingToUndoError()
        edit, undo = self._done.pop()
        undo()
        self._undone.append(edit)

    def redo(self) -> E:
        if not self._undone:
            raise NothingToRedoError()
        edit = self._undone.pop()
        self._done.append((edit, self._apply(edit)))
        return edit
