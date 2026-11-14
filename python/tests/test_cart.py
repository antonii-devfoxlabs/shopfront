import pytest

from shopfront.cart import Cart, NothingToUndoError, NotInCartError


def test_adding_the_same_product_twice_adds_up():
    cart = Cart()
    cart.add("MUG-01")
    cart.add("MUG-01", 2)
    assert cart.lines == {"MUG-01": 3}


def test_adding_nothing_is_an_error():
    with pytest.raises(ValueError):
        Cart().add("MUG-01", 0)


def test_changing_a_quantity_to_zero_removes_the_line():
    cart = Cart()
    cart.add("MUG-01", 2)
    cart.change_quantity("MUG-01", 0)
    assert cart.is_empty()


def test_changing_a_quantity_sets_it():
    cart = Cart()
    cart.add("MUG-01", 2)
    cart.change_quantity("MUG-01", 5)
    assert cart.lines == {"MUG-01": 5}


def test_a_product_not_in_the_cart_cannot_change():
    with pytest.raises(NotInCartError):
        Cart().change_quantity("MUG-01", 2)
    with pytest.raises(NotInCartError):
        Cart().remove("MUG-01")


def test_removing_a_line():
    cart = Cart()
    cart.add("MUG-01")
    cart.add("TEA-02")
    cart.remove("MUG-01")
    assert cart.lines == {"TEA-02": 1}


def test_undo_puts_back_the_line_just_removed():
    cart = Cart()
    cart.add("KTL-03", 2)
    cart.add("TEA-02")
    cart.remove("KTL-03")
    cart.undo_remove()
    assert cart.lines == {"TEA-02": 1, "KTL-03": 2}


def test_there_is_nothing_to_undo_before_a_removal():
    cart = Cart()
    cart.add("KTL-03")
    with pytest.raises(NothingToUndoError):
        cart.undo_remove()
