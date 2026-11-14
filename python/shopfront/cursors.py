"""Walking any collection Shopfront keeps, one item at a time."""

from typing import Protocol


class Cursor[T](Protocol):
    """Every cursor fills this slot, whatever collection it walks: it
    hands over the items one at a time and keeps its own place. Each
    collection makes its own kind."""

    def next(self) -> T | None:
        """The next item, or None once every one is handed over."""
        ...


def take[T](cursor: Cursor[T], count: int) -> list[T]:
    """The next `count` items from the cursor, or fewer at the end."""
    taken: list[T] = []
    while len(taken) < count:
        item = cursor.next()
        if item is None:
            break
        taken.append(item)
    return taken
