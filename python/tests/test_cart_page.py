import pytest

from shopfront.cart import Cart
from shopfront.cart_page import CartPage, restore
from shopfront.edits import (
    AddLine,
    ChangeQuantity,
    EmptyCart,
    RemoveLine,
    minus,
)
from shopfront.history import NothingToRedoError, NothingToUndoError


def test_the_message_says_what_the_last_edit_did():
    cart = Cart()
    page = CartPage(cart)
    page.press(AddLine("KTL-03"))
    assert page.message == "Added KTL-03"
    page.press(ChangeQuantity("KTL-03", 3))
    assert page.message == "KTL-03 set to 3"
    page.press(RemoveLine("KTL-03"))
    assert page.message == "Removed KTL-03"


def test_undo_puts_back_what_remove_took():
    cart = Cart()
    cart.add("KTL-03", 2)
    page = CartPage(cart)
    page.press(RemoveLine("KTL-03"))
    page.undo()
    assert cart.lines == {"KTL-03": 2}
    assert page.message == ""


def test_minus_at_one_removes_the_line_and_undo_puts_it_back():
    cart = Cart()
    cart.add("MUG-01")
    page = CartPage(cart)
    page.press(minus(cart, "MUG-01"))
    assert page.message == "Removed MUG-01"
    assert cart.is_empty()
    page.undo()
    assert cart.lines == {"MUG-01": 1}


def test_minus_above_one_takes_one_away():
    cart = Cart()
    cart.add("MUG-01", 3)
    page = CartPage(cart)
    page.press(minus(cart, "MUG-01"))
    assert page.message == "MUG-01 set to 2"
    page.undo()
    assert cart.lines == {"MUG-01": 3}


def test_undo_after_empty_cart_puts_every_line_back():
    cart = Cart()
    page = CartPage(cart)
    page.press(AddLine("KTL-03"))
    page.press(AddLine("MUG-01"))
    page.press(EmptyCart())
    page.undo()
    assert cart.lines == {"KTL-03": 1, "MUG-01": 1}


def test_there_is_nothing_to_undo_before_an_edit():
    with pytest.raises(NothingToUndoError):
        CartPage(Cart()).undo()


def test_undo_twice_takes_both_edits_back():
    cart = Cart()
    page = CartPage(cart)
    page.press(AddLine("KTL-03"))
    page.press(AddLine("MUG-01"))
    page.undo()
    assert cart.lines == {"KTL-03": 1}
    page.undo()
    assert cart.is_empty()
    with pytest.raises(NothingToUndoError):
        page.undo()


def test_redo_runs_the_undone_edits_again_newest_first():
    cart = Cart()
    page = CartPage(cart)
    page.press(AddLine("KTL-03"))
    page.press(AddLine("MUG-01"))
    page.undo()
    page.undo()
    page.redo()
    assert cart.lines == {"KTL-03": 1}
    assert page.message == "Added KTL-03"
    page.redo()
    assert cart.lines == {"KTL-03": 1, "MUG-01": 1}


def test_there_is_nothing_to_redo_before_an_undo():
    cart = Cart()
    page = CartPage(cart)
    page.press(AddLine("KTL-03"))
    with pytest.raises(NothingToRedoError):
        page.redo()


def test_redo_after_empty_cart_has_nothing_to_redo():
    cart = Cart()
    page = CartPage(cart)
    page.press(AddLine("KTL-03"))
    page.press(RemoveLine("KTL-03"))
    page.undo()
    page.press(EmptyCart())
    with pytest.raises(NothingToRedoError):
        page.redo()
    assert cart.is_empty()


def test_the_log_holds_every_press_undo_and_redo_in_order():
    cart = Cart()
    page = CartPage(cart)
    page.press(AddLine("KTL-03"))
    page.press(ChangeQuantity("KTL-03", 3))
    page.undo()
    page.redo()
    assert page.log == ["Added KTL-03", "KTL-03 set to 3", "Undo", "Redo"]


def test_a_restart_brings_back_the_cart_from_the_log():
    cart = Cart()
    page = CartPage(cart)
    page.press(AddLine("KTL-03"))
    page.press(AddLine("MUG-01"))
    page.press(ChangeQuantity("MUG-01", 3))
    page.press(RemoveLine("KTL-03"))
    page.undo()
    restored_cart = Cart()
    restore(restored_cart, page.log)
    assert restored_cart.lines == cart.lines


def test_undo_still_works_after_a_restart():
    cart = Cart()
    page = CartPage(cart)
    page.press(AddLine("KTL-03"))
    page.press(EmptyCart())
    restored_cart = Cart()
    restored = restore(restored_cart, page.log)
    restored.undo()
    assert restored_cart.lines == {"KTL-03": 1}
