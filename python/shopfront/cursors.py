"""Walking any collection Shopfront keeps, one item at a time.

A generator expression keeps and changes the items of any cursor, and
itertools.islice stops a plain one; Python has no islice for an async
cursor, so this module has it.
"""

from collections.abc import AsyncIterable, AsyncIterator


async def take_async[T](
    cursor: AsyncIterable[T], count: int
) -> AsyncIterator[T]:
    """The first `count` items of an async cursor, asked for one at a
    time, and none asked for after the last of them."""
    if count <= 0:
        return
    taken = 0
    async for item in cursor:
        yield item
        taken += 1
        if taken == count:
            return
