from functools import partial

import pytest

from shopfront.cart import Cart
from shopfront.edits import AddLine, Edit, RemoveLine, apply
from shopfront.history import (
    History,
    NothingToRedoError,
    NothingToUndoError,
    Undo,
)


def cart_history(cart: Cart) -> History[Edit]:
    return History(partial(apply, cart))


def test_undo_takes_back_the_newest_edit_first():
    cart = Cart()
    history = cart_history(cart)
    history.run(AddLine("KTL-03"))
    history.run(AddLine("MUG-01"))
    history.undo()
    assert cart.lines == {"KTL-03": 1}


def test_redo_runs_the_edit_undo_took_back():
    cart = Cart()
    cart.add("KTL-03", 2)
    history = cart_history(cart)
    history.run(RemoveLine("KTL-03"))
    history.undo()
    edit = history.redo()
    assert cart.is_empty()
    assert edit == RemoveLine("KTL-03")


def test_an_empty_history_has_nothing_to_undo_or_redo():
    history = cart_history(Cart())
    with pytest.raises(NothingToUndoError):
        history.undo()
    with pytest.raises(NothingToRedoError):
        history.redo()


def test_a_new_edit_lets_go_of_the_undone_ones():
    cart = Cart()
    history = cart_history(cart)
    history.run(AddLine("KTL-03"))
    history.undo()
    history.run(AddLine("MUG-01"))
    with pytest.raises(NothingToRedoError):
        history.redo()
    assert cart.lines == {"MUG-01": 1}


def test_the_history_runs_any_edit_it_is_given_a_way_to_apply():
    notes: list[str] = []

    def apply_note(note: str) -> Undo:
        notes.append(note)
        return partial(notes.remove, note)

    history = History(apply_note)
    history.run("Gift wrap")
    history.undo()
    assert notes == []
    assert history.redo() == "Gift wrap"
    assert notes == ["Gift wrap"]
