"""Walking any collection Shopfront keeps, one item at a time."""

from collections.abc import AsyncIterator


async def take_async[T](cursor: AsyncIterator[T], count: int) -> list[T]:
    """The next `count` items from an async cursor, or fewer at the end."""
    taken: list[T] = []
    while len(taken) < count:
        try:
            item = await anext(cursor)
        except StopAsyncIteration:
            break
        taken.append(item)
    return taken
