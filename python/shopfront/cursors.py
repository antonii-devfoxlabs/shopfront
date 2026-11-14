"""Walking any collection Shopfront keeps, one item at a time."""

from collections.abc import Iterator


def take[T](cursor: Iterator[T], count: int) -> list[T]:
    """The next `count` items from the cursor, or fewer at the end."""
    taken: list[T] = []
    while len(taken) < count:
        try:
            item = next(cursor)
        except StopIteration:
            break
        taken.append(item)
    return taken
