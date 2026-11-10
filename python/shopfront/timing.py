"""A function decorator: it takes a function and gives back a new one.

The new function takes the same arguments, does one job of its own and
calls the function it wraps, so neither that function nor its callers
change. It names nothing of Shopfront's, so it fits any function.
"""

import functools
import time
from collections.abc import Callable


def timed[**P, R](
    name: str, call: Callable[P, R], log: Callable[[str], None]
) -> Callable[P, R]:
    """Gives back a function that calls `call`, timed and logged."""

    @functools.wraps(call)
    def timed_call(*args: P.args, **kwargs: P.kwargs) -> R:
        started = time.perf_counter()
        answer = call(*args, **kwargs)
        took_ms = (time.perf_counter() - started) * 1000
        log(f"{name} in {took_ms:.0f} ms")
        return answer

    return timed_call
