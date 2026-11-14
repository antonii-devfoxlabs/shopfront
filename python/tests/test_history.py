import pytest

from shopfront.cart import Cart
from shopfront.edits import AddLine, RemoveLine
from shopfront.history import History, NothingToRedoError, NothingToUndoError


def test_undo_takes_back_the_newest_edit_first():
    cart = Cart()
    history = History()
    history.run(AddLine(cart, "KTL-03"))
    history.run(AddLine(cart, "MUG-01"))
    history.undo()
    assert cart.lines == {"KTL-03": 1}


def test_redo_runs_the_edit_undo_took_back():
    cart = Cart()
    cart.add("KTL-03", 2)
    history = History()
    history.run(RemoveLine(cart, "KTL-03"))
    history.undo()
    edit = history.redo()
    assert cart.is_empty()
    assert edit.label() == "Removed KTL-03"


def test_an_empty_history_has_nothing_to_undo_or_redo():
    history = History()
    with pytest.raises(NothingToUndoError):
        history.undo()
    with pytest.raises(NothingToRedoError):
        history.redo()


def test_a_new_edit_lets_go_of_the_undone_ones():
    cart = Cart()
    history = History()
    history.run(AddLine(cart, "KTL-03"))
    history.undo()
    history.run(AddLine(cart, "MUG-01"))
    with pytest.raises(NothingToRedoError):
        history.redo()
    assert cart.lines == {"MUG-01": 1}
