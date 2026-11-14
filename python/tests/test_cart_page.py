import pytest

from shopfront.cart import Cart
from shopfront.cart_page import CartPage, NothingToUndoError


def test_the_message_says_what_the_last_edit_did():
    page = CartPage(Cart())
    page.plus("KTL-03")
    assert page.message == "Added KTL-03"
    page.set_quantity("KTL-03", 3)
    assert page.message == "KTL-03 set to 3"
    page.remove("KTL-03")
    assert page.message == "Removed KTL-03"


def test_undo_puts_back_what_remove_took():
    cart = Cart()
    cart.add("KTL-03", 2)
    page = CartPage(cart)
    page.remove("KTL-03")
    page.undo()
    assert cart.lines == {"KTL-03": 2}
    assert page.message == ""


def test_minus_at_one_removes_the_line_and_undo_puts_it_back():
    cart = Cart()
    cart.add("MUG-01")
    page = CartPage(cart)
    page.minus("MUG-01")
    assert page.message == "Removed MUG-01"
    assert cart.is_empty()
    page.undo()
    assert cart.lines == {"MUG-01": 1}


def test_there_is_nothing_to_undo_before_an_edit():
    with pytest.raises(NothingToUndoError):
        CartPage(Cart()).undo()
