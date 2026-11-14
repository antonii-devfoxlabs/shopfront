import json
from dataclasses import asdict

import pytest

from shopfront.cart import Cart, NotInCartError
from shopfront.edits import (
    AddLine,
    ChangeQuantity,
    EmptyCart,
    RemoveLine,
    apply,
    label,
)


def test_a_removal_takes_its_line_away():
    cart = Cart()
    cart.add("KTL-03", 2)
    cart.add("TEA-02")
    apply(cart, RemoveLine("KTL-03"))
    assert cart.lines == {"TEA-02": 1}


def test_undoing_a_removal_puts_its_line_back():
    cart = Cart()
    cart.add("KTL-03", 2)
    cart.add("TEA-02")
    undo = apply(cart, RemoveLine("KTL-03"))
    undo()
    assert cart.lines == {"TEA-02": 1, "KTL-03": 2}


def test_a_product_not_in_the_cart_cannot_be_removed():
    with pytest.raises(NotInCartError):
        apply(Cart(), RemoveLine("KTL-03"))


def test_undo_puts_back_the_line_its_own_removal_took():
    cart = Cart()
    cart.add("MUG-01")
    cart.add("KTL-03")
    apply(cart, RemoveLine("KTL-03"))
    undo = apply(cart, RemoveLine("MUG-01"))
    undo()
    assert cart.lines == {"MUG-01": 1}


def test_undoing_an_add_takes_a_new_line_away():
    cart = Cart()
    cart.add("TEA-02")
    undo = apply(cart, AddLine("KTL-03"))
    undo()
    assert cart.lines == {"TEA-02": 1}


def test_undoing_an_add_puts_back_the_quantity_before_it():
    cart = Cart()
    cart.add("MUG-01", 2)
    undo = apply(cart, AddLine("MUG-01"))
    assert cart.lines == {"MUG-01": 3}
    undo()
    assert cart.lines == {"MUG-01": 2}


def test_undoing_a_quantity_change_sets_the_old_one_back():
    cart = Cart()
    cart.add("MUG-01", 2)
    undo = apply(cart, ChangeQuantity("MUG-01", 5))
    undo()
    assert cart.lines == {"MUG-01": 2}


def test_undoing_a_change_to_zero_puts_the_line_back():
    cart = Cart()
    cart.add("MUG-01", 2)
    undo = apply(cart, ChangeQuantity("MUG-01", 0))
    assert cart.is_empty()
    undo()
    assert cart.lines == {"MUG-01": 2}


def test_undoing_an_emptying_puts_every_line_back_in_order():
    cart = Cart()
    cart.add("MUG-01", 2)
    cart.add("KTL-03")
    cart.add("TEA-02", 3)
    undo = apply(cart, EmptyCart())
    assert cart.is_empty()
    undo()
    assert list(cart.lines.items()) == [
        ("MUG-01", 2),
        ("KTL-03", 1),
        ("TEA-02", 3),
    ]


def test_one_edit_applied_twice_undoes_each_time_on_its_own():
    cart = Cart()
    plus_kettle = AddLine("KTL-03")
    first = apply(cart, plus_kettle)
    second = apply(cart, plus_kettle)
    second()
    first()
    assert cart.is_empty()


def test_every_edit_names_itself_for_the_page():
    assert label(AddLine("KTL-03")) == "Added KTL-03"
    assert label(ChangeQuantity("KTL-03", 3)) == "KTL-03 set to 3"
    assert label(ChangeQuantity("KTL-03", 0)) == "Removed KTL-03"
    assert label(RemoveLine("KTL-03")) == "Removed KTL-03"
    assert label(EmptyCart()) == "Emptied the cart"


def test_an_edit_holds_only_plain_values():
    assert json.dumps(asdict(AddLine("KTL-03", 2))) == (
        '{"sku": "KTL-03", "quantity": 2}'
    )
