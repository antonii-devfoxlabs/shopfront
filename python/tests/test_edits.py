import pytest

from shopfront.cart import Cart, NotInCartError
from shopfront.edits import AddLine, ChangeQuantity, EmptyCart, RemoveLine


def test_a_removal_takes_its_line_away():
    cart = Cart()
    cart.add("KTL-03", 2)
    cart.add("TEA-02")
    RemoveLine(cart, "KTL-03").run()
    assert cart.lines == {"TEA-02": 1}


def test_undoing_a_removal_puts_its_line_back():
    cart = Cart()
    cart.add("KTL-03", 2)
    cart.add("TEA-02")
    removal = RemoveLine(cart, "KTL-03")
    removal.run()
    removal.undo()
    assert cart.lines == {"TEA-02": 1, "KTL-03": 2}


def test_a_product_not_in_the_cart_cannot_be_removed():
    with pytest.raises(NotInCartError):
        RemoveLine(Cart(), "KTL-03").run()


def test_undo_puts_back_the_line_its_own_removal_took():
    cart = Cart()
    cart.add("MUG-01")
    cart.add("KTL-03")
    RemoveLine(cart, "KTL-03").run()
    last = RemoveLine(cart, "MUG-01")
    last.run()
    last.undo()
    assert cart.lines == {"MUG-01": 1}


def test_undoing_an_add_takes_a_new_line_away():
    cart = Cart()
    cart.add("TEA-02")
    addition = AddLine(cart, "KTL-03")
    addition.run()
    addition.undo()
    assert cart.lines == {"TEA-02": 1}


def test_undoing_an_add_puts_back_the_quantity_before_it():
    cart = Cart()
    cart.add("MUG-01", 2)
    addition = AddLine(cart, "MUG-01")
    addition.run()
    assert cart.lines == {"MUG-01": 3}
    addition.undo()
    assert cart.lines == {"MUG-01": 2}


def test_undoing_a_quantity_change_sets_the_old_one_back():
    cart = Cart()
    cart.add("MUG-01", 2)
    change = ChangeQuantity(cart, "MUG-01", 5)
    change.run()
    change.undo()
    assert cart.lines == {"MUG-01": 2}


def test_undoing_a_change_to_zero_puts_the_line_back():
    cart = Cart()
    cart.add("MUG-01", 2)
    change = ChangeQuantity(cart, "MUG-01", 0)
    change.run()
    assert cart.is_empty()
    change.undo()
    assert cart.lines == {"MUG-01": 2}


def test_undoing_an_emptying_puts_every_line_back_in_order():
    cart = Cart()
    cart.add("MUG-01", 2)
    cart.add("KTL-03")
    cart.add("TEA-02", 3)
    emptying = EmptyCart(cart)
    emptying.run()
    assert cart.is_empty()
    emptying.undo()
    assert list(cart.lines.items()) == [
        ("MUG-01", 2),
        ("KTL-03", 1),
        ("TEA-02", 3),
    ]


def test_every_edit_names_itself_for_the_page():
    cart = Cart()
    assert AddLine(cart, "KTL-03").label() == "Added KTL-03"
    assert ChangeQuantity(cart, "KTL-03", 3).label() == "KTL-03 set to 3"
    assert ChangeQuantity(cart, "KTL-03", 0).label() == "Removed KTL-03"
    assert RemoveLine(cart, "KTL-03").label() == "Removed KTL-03"
    assert EmptyCart(cart).label() == "Emptied the cart"
