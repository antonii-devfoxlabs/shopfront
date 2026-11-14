"""What a shopper asks the cart page to do, as data that can be written
down, and the one function that runs it."""

import json
from dataclasses import asdict, dataclass
from functools import partial
from typing import assert_never, get_args

from shopfront.cart import Cart
from shopfront.history import Undo


@dataclass(frozen=True)
class AddLine:
    sku: str
    quantity: int = 1


@dataclass(frozen=True)
class ChangeQuantity:
    sku: str
    quantity: int


@dataclass(frozen=True)
class RemoveLine:
    sku: str


@dataclass(frozen=True)
class EmptyCart:
    pass


type Edit = AddLine | ChangeQuantity | RemoveLine | EmptyCart


def apply(cart: Cart, edit: Edit) -> Undo:
    """Runs the edit on the cart, and answers what takes it back."""
    match edit:
        case AddLine(sku, quantity):
            # Read what the line held before the add: undo needs it.
            before = cart.lines.get(sku, 0)
            cart.add(sku, quantity)
            if before == 0:
                return partial(cart.remove, sku)
            return partial(cart.change_quantity, sku, before)
        case ChangeQuantity(sku, quantity):
            # Read the quantity before it changes: undo needs it.
            before = cart.lines.get(sku, 0)
            cart.change_quantity(sku, quantity)
            if quantity < 1:
                # The change took the line away: add it back.
                return partial(cart.add, sku, before)
            return partial(cart.change_quantity, sku, before)
        case RemoveLine(sku):
            # Read the quantity before the line goes: undo needs it.
            before = cart.lines.get(sku, 0)
            cart.remove(sku)
            return partial(cart.add, sku, before)
        case EmptyCart():
            # A copy, made before the lines go: undo needs every one.
            lines = dict(cart.lines)
            for sku in lines:
                cart.remove(sku)
            return partial(_put_back, cart, lines)
        case _:
            assert_never(edit)


def _put_back(cart: Cart, lines: dict[str, int]) -> None:
    for sku, quantity in lines.items():
        cart.add(sku, quantity)


def label(edit: Edit) -> str:
    """What the page's message says about the edit."""
    match edit:
        case AddLine(sku):
            return f"Added {sku}"
        case ChangeQuantity(sku, quantity):
            if quantity < 1:
                return f"Removed {sku}"
            return f"{sku} set to {quantity}"
        case RemoveLine(sku):
            return f"Removed {sku}"
        case EmptyCart():
            return "Emptied the cart"
        case _:
            assert_never(edit)


# Every kind of edit by its name, read from Edit itself: a kind added to
# Edit can be read back from the log with no other line to change.
_KINDS: dict[str, type[Edit]] = {
    kind.__name__: kind for kind in get_args(Edit.__value__)
}


def write(edit: Edit) -> str:
    """The edit as one line of JSON, for the log."""
    return json.dumps({"kind": type(edit).__name__, **asdict(edit)})


def read(line: str) -> Edit:
    """The edit a line of the log was written from."""
    fields = json.loads(line)
    kind = _KINDS[fields.pop("kind")]
    return kind(**fields)


def minus(cart: Cart, sku: str) -> Edit:
    """The minus button's edit: a removal at one, one fewer above it."""
    quantity = cart.lines.get(sku, 0)
    if quantity == 1:
        return RemoveLine(sku)
    return ChangeQuantity(sku, quantity - 1)
