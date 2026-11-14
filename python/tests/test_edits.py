import pytest

from shopfront.cart import Cart, NotInCartError
from shopfront.edits import RemoveLine


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
