import asyncio
from collections.abc import AsyncIterator

from shopfront.cursors import take_async


def test_a_pipeline_asks_its_cursor_for_no_item_after_the_last_it_hands_over():
    asked: list[int] = []

    async def numbers() -> AsyncIterator[int]:
        for number in range(1, 10):
            asked.append(number)
            yield number

    async def first_two_odd() -> list[int]:
        odd = (number * 10 async for number in numbers() if number % 2)
        return [number async for number in take_async(odd, 2)]

    assert asyncio.run(first_two_odd()) == [10, 30]
    assert asked == [1, 2, 3]


def test_taking_none_asks_for_nothing():
    asked: list[int] = []

    async def numbers() -> AsyncIterator[int]:
        asked.append(1)
        yield 1

    async def none() -> list[int]:
        return [number async for number in take_async(numbers(), 0)]

    assert asyncio.run(none()) == []
    assert asked == []
